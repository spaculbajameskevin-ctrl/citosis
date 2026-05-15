import smtplib
import logging

from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.shortcuts import render
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views import View
from rest_framework import serializers, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.emails import (
    send_email_verification_email,
    send_password_reset_email,
    send_registration_approved_email,
    send_two_factor_code_email,
)
from accounts.models import AuthChallenge, Establishment, User
from accounts.permissions import IsActiveSystemUser, IsSuperAdminOnly
from accounts.security import (
    clear_login_lockout,
    format_lockout_deadline,
    get_active_challenge_by_token,
    get_active_two_factor_challenge,
    is_super_admin_user,
    issue_email_verification_challenge,
    issue_password_reset_challenge,
    issue_super_admin_two_factor_challenge,
    mark_challenge_used,
    mark_email_verified,
    mask_email_address,
    record_failed_login,
    verify_two_factor_code,
)
from accounts.serializers import (
    ForgotPasswordSerializer,
    EstablishmentSerializer,
    LoginSerializer,
    ProfileSerializer,
    RegistrationSerializer,
    ResendVerificationSerializer,
    TwoFactorSerializer,
    UserSerializer,
)
from audit.services import log_action, soft_delete_to_recycle
from audit.services import create_user_registration_notifications
from citosis_pro.common import RecycleItemTypeChoices, UserStatusChoices


logger = logging.getLogger(__name__)


def _find_user_by_login(login_value):
    normalized_value = str(login_value or '').strip()
    if not normalized_value:
        return None
    return User.all_objects.filter(
        Q(email__iexact=normalized_value) | Q(username__iexact=normalized_value),
        deleted_at__isnull=True,
    ).first()


def _build_login_response(user, request):
    last_seen_at = timezone.now()
    User.all_objects.filter(pk=user.pk).update(
        last_login=last_seen_at,
        failed_login_attempts=0,
        locked_until=None,
    )
    user.last_login = last_seen_at
    user.failed_login_attempts = 0
    user.locked_until = None
    token, _ = Token.objects.get_or_create(user=user)
    log_action(user, 'User login', f'{user.username} signed in.', request)
    return Response({'token': token.key, 'user': UserSerializer(user, context={'request': request}).data})


def _validate_new_password(user, password):
    try:
        password_validation.validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({'password': list(exc.messages)}) from exc


def _should_skip_2fa_for_dev() -> bool:
    """Allow skipping 2FA only in local development."""
    if not settings.DEBUG:
        return False
    if getattr(settings, 'SKIP_SUPER_ADMIN_2FA', False):
        return True
    is_console_backend = 'console' in settings.EMAIL_BACKEND.lower()
    return is_console_backend


def _should_require_super_admin_2fa() -> bool:
    if getattr(settings, 'SKIP_SUPER_ADMIN_2FA', False):
        return False
    return getattr(settings, 'REQUIRE_SUPER_ADMIN_2FA', True)


def _is_missing_gmail_app_password() -> bool:
    if getattr(settings, 'EMAIL_DELIVERY_METHOD', 'smtp') != 'smtp':
        return False
    if 'smtp' not in settings.EMAIL_BACKEND.lower():
        return False
    if str(getattr(settings, 'EMAIL_HOST', '') or '').lower() != 'smtp.gmail.com':
        return False
    password = str(getattr(settings, 'EMAIL_HOST_PASSWORD', '') or '').strip()
    compact_password = password.replace(' ', '')
    return (
        not password
        or password == 'your-gmail-app-password'
        or len(compact_password) != 16
    )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_value = serializer.validated_data['username']
        password = serializer.validated_data['password']
        user = _find_user_by_login(login_value)

        if not user:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.locked_until and user.locked_until > timezone.now():
            return Response(
                {'detail': f'Too many failed sign-in attempts. Try again after {format_lockout_deadline(user.locked_until)}.'},
                status=423,
            )

        if not user.check_password(password):
            _, is_now_locked = record_failed_login(user)
            if is_now_locked:
                return Response(
                    {'detail': f'Too many failed sign-in attempts. Try again after {format_lockout_deadline(user.locked_until)}.'},
                    status=423,
                )
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_400_BAD_REQUEST)

        clear_login_lockout(user)

        if user.status == UserStatusChoices.PENDING_APPROVAL:
            return Response(
                {'detail': 'Your account is still pending admin approval.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.status == UserStatusChoices.INACTIVE:
            return Response(
                {'detail': 'Your account is inactive. Please contact an administrator.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.email_verified_at:
            return Response(
                {
                    'detail': f'Your email is not verified yet. Check the verification link sent to {mask_email_address(user.email)} or request a new one.',
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if is_super_admin_user(user):
            if _should_skip_2fa_for_dev() or not _should_require_super_admin_2fa():
                return _build_login_response(user, request)

            try:
                challenge, code = issue_super_admin_two_factor_challenge(user)
                send_two_factor_code_email(user, code)
            except Exception:
                logger.exception('Super admin 2FA initiation failed.')
                if 'challenge' in locals() and challenge:
                    try:
                        challenge.delete()
                    except Exception:
                        logger.exception('Failed to clean up 2FA challenge after error.')
                return Response(
                    {'detail': 'We could not start Super Admin verification right now. Check Render email/database setup, then try again.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(
                {
                    'detail': f'A 6-digit verification code was sent to {mask_email_address(user.email)}.',
                    'requires_two_factor': True,
                    'challenge_id': str(challenge.pk),
                    'masked_email': mask_email_address(user.email),
                }
            )

        return _build_login_response(user, request)


class VerifyTwoFactorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TwoFactorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = get_active_two_factor_challenge(serializer.validated_data['challenge_id'])
        if not challenge:
            return Response({'detail': 'This verification code has expired. Please sign in again.'}, status=status.HTTP_400_BAD_REQUEST)

        if not verify_two_factor_code(challenge, serializer.validated_data['code']):
            if challenge.used_at:
                return Response({'detail': 'Too many invalid verification code attempts. Please sign in again.'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        user = challenge.user
        if user.status != UserStatusChoices.ACTIVE:
            mark_challenge_used(challenge)
            return Response({'detail': 'This account can no longer sign in.'}, status=status.HTTP_403_FORBIDDEN)
        if not user.email_verified_at:
            mark_challenge_used(challenge)
            return Response({'detail': 'Please verify your email before signing in.'}, status=status.HTTP_403_FORBIDDEN)

        mark_challenge_used(challenge)
        return _build_login_response(user, request)


class ResendTwoFactorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        challenge_id = request.data.get('challenge_id')
        challenge = get_active_two_factor_challenge(challenge_id)
        if not challenge:
            return Response({'detail': 'This verification request has expired. Please sign in again.'}, status=status.HTTP_400_BAD_REQUEST)

        user = challenge.user
        mark_challenge_used(challenge)
        try:
            new_challenge, code = issue_super_admin_two_factor_challenge(user)
            send_two_factor_code_email(user, code)
        except Exception:
            logger.exception('Super admin 2FA resend failed.')
            if 'new_challenge' in locals() and new_challenge:
                try:
                    new_challenge.delete()
                except Exception:
                    logger.exception('Failed to clean up resent 2FA challenge after error.')
            return Response(
                {'detail': 'We could not resend the verification code right now. Check Render email/database setup, then try signing in again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                'detail': f'A new verification code was sent to {mask_email_address(user.email)}.',
                'challenge_id': str(new_challenge.pk),
                'masked_email': mask_email_address(user.email),
            }
        )


class RegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if _is_missing_gmail_app_password():
            return Response(
                {'detail': 'Email is not configured yet. Use a 16-character Gmail App Password in EMAIL_HOST_PASSWORD, then restart Django and try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = RegistrationSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            raise
        except Exception:
            logger.exception('Registration validation failed unexpectedly.')
            return Response(
                {'detail': 'We could not validate your registration right now. Please try again in a moment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            user = serializer.save()
        except Exception:
            logger.exception('Registration user creation failed.')
            return Response(
                {'detail': 'We could not create your account right now. Please try again in a moment.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        verification_email_sent = False
        notification_created = False
        try:
            challenge = issue_email_verification_challenge(user)
            send_email_verification_email(user, challenge)
            verification_email_sent = True
        except smtplib.SMTPAuthenticationError:
            logger.exception('Gmail rejected registration verification email.')
        except Exception:
            logger.exception('Registration verification email failed.')

        try:
            log_action(user, 'User registration request', f'{user.email} submitted a new account request.', request)
            create_user_registration_notifications(user, send_email=False)
            notification_created = True
        except Exception:
            logger.exception('Registration notification creation failed.')

        detail = (
            'Registration submitted successfully. Check your email to verify your address, then wait for Super Admin approval.'
            if verification_email_sent
            else 'Registration submitted successfully, but we could not send the verification email right now. Ask an admin to check email settings, then use Resend Verification.'
        )
        return Response(
            {
                'detail': detail,
                'verification_email_sent': verification_email_sent,
                'admin_notification_created': notification_created,
                'user': UserSerializer(user, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.all_objects.filter(email__iexact=email, deleted_at__isnull=True).first()
        if user and user.email:
            try:
                challenge = issue_password_reset_challenge(user)
                send_password_reset_email(user, challenge)
            except Exception:
                pass
        return Response({'detail': 'If an account exists for that email, a password reset link has been sent.'})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.all_objects.filter(email__iexact=email, deleted_at__isnull=True).first()
        if user and user.email and not user.email_verified_at:
            try:
                challenge = issue_email_verification_challenge(user)
                send_email_verification_email(user, challenge)
            except Exception:
                pass
        return Response({'detail': 'If an account exists for that email, a verification email has been sent.'})


class LogoutView(APIView):
    permission_classes = [IsActiveSystemUser]

    def post(self, request):
        if request.auth:
            request.auth.delete()
        log_action(request.user, 'User logout', f'{request.user.username} signed out.', request)
        return Response({'detail': 'Logged out successfully.'})


class MeView(APIView):
    permission_classes = [IsActiveSystemUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_action(request.user, 'Updated profile', 'Updated account profile details.', request)
        return Response(UserSerializer(user, context={'request': request}).data)


class EstablishmentViewSet(viewsets.ModelViewSet):
    serializer_class = EstablishmentSerializer
    queryset = Establishment.objects.all().order_by('name')

    def get_permissions(self):
        if self.action in {'list', 'retrieve'}:
            return [AllowAny()]
        return [IsSuperAdminOnly()]

    def perform_create(self, serializer):
        establishment = serializer.save()
        log_action(
            self.request.user,
            'Created establishment',
            f'Added establishment #{establishment.pk} ({establishment.name}).',
            self.request,
        )


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('-updated_at')

    def get_permissions(self):
        return [IsSuperAdminOnly()]

    def get_queryset(self):
        queryset = User.objects.all().order_by('-updated_at')
        search = self.request.query_params.get('search', '').strip()
        role = self.request.query_params.get('role', '').strip()
        status_value = self.request.query_params.get('status', '').strip()
        if search:
            queryset = queryset.filter(name__icontains=search) | queryset.filter(username__icontains=search) | queryset.filter(email__icontains=search) | queryset.filter(office__icontains=search)
        if role:
            queryset = queryset.filter(role=role)
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset.distinct()

    def perform_create(self, serializer):
        user = serializer.save()
        log_action(self.request.user, 'Created user account', f'Created user #{user.pk} ({user.email}).', self.request)

    def perform_update(self, serializer):
        if (
            self.request.user.pk == serializer.instance.pk
            and 'status' in serializer.validated_data
            and serializer.validated_data['status'] != UserStatusChoices.ACTIVE
        ):
            raise serializers.ValidationError({'status': 'You cannot deactivate or suspend your own account.'})
        user = serializer.save()
        log_action(self.request.user, 'Updated user account', f'Updated user #{user.pk} ({user.email}).', self.request)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.pk == request.user.pk:
            return Response({'detail': 'You cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        soft_delete_to_recycle(instance, RecycleItemTypeChoices.USER, request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdminOnly])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password') or 'changeme123'
        _validate_new_password(user, new_password)
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until', 'updated_at', 'is_active', 'is_staff'])
        log_action(request.user, 'Password reset', f'Reset password for user #{user.pk}.', request)
        return Response({'detail': 'Password reset successfully.'})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdminOnly], url_path='set-status')
    def set_status(self, request, pk=None):
        user = self.get_object()
        next_status = str(request.data.get('status') or '').strip()
        if next_status not in UserStatusChoices.values:
            return Response({'detail': 'Invalid user status.'}, status=status.HTTP_400_BAD_REQUEST)
        if user.pk == request.user.pk and next_status != UserStatusChoices.ACTIVE:
            return Response({'detail': 'You cannot deactivate or suspend your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        previous_status = user.status
        if previous_status == next_status:
            return Response({'detail': f'User is already {next_status}.'})

        user.status = next_status
        user.save(update_fields=['status', 'updated_at', 'is_active', 'is_staff'])
        if previous_status == UserStatusChoices.PENDING_APPROVAL and next_status == UserStatusChoices.ACTIVE:
            try:
                send_registration_approved_email(user)
            except Exception:
                pass
            if not user.email_verified_at:
                try:
                    challenge = issue_email_verification_challenge(user)
                    send_email_verification_email(user, challenge)
                except Exception:
                    pass

        action_label = 'Approved user account' if previous_status == UserStatusChoices.PENDING_APPROVAL and next_status == UserStatusChoices.ACTIVE else 'Changed user status'
        log_action(
            request.user,
            action_label,
            f'Changed user #{user.pk} ({user.email}) from {previous_status} to {next_status}.',
            request,
        )
        detail = (
            'User registration approved successfully. They can sign in after verifying their email.'
            if previous_status == UserStatusChoices.PENDING_APPROVAL and next_status == UserStatusChoices.ACTIVE and not user.email_verified_at
            else 'User registration approved successfully.'
            if previous_status == UserStatusChoices.PENDING_APPROVAL and next_status == UserStatusChoices.ACTIVE
            else 'User status updated successfully.'
        )
        return Response({'detail': detail, 'user': UserSerializer(user, context={'request': request}).data})


class VerifyEmailView(View):
    template_name = 'citosis/auth_status.html'

    def get(self, request, token):
        challenge = get_active_challenge_by_token(token, AuthChallenge.PurposeChoices.EMAIL_VERIFICATION)
        if not challenge:
            return render(
                request,
                self.template_name,
                {
                    'title': 'Verification link unavailable',
                    'message': 'This email verification link is invalid or has already expired. Request a new verification email from the sign-in page.',
                    'is_success': False,
                },
            )

        user = challenge.user
        mark_email_verified(user)
        mark_challenge_used(challenge)
        log_action(user, 'Verified email', 'Completed email verification.', request)
        message = (
            'Your email has been verified. Your account is still waiting for Super Admin approval.'
            if user.status == UserStatusChoices.PENDING_APPROVAL
            else 'Your email has been verified. You can now sign in to CITOSIS PRO.'
        )
        return render(
            request,
            self.template_name,
            {
                'title': 'Email verified',
                'message': message,
                'is_success': True,
            },
        )


class PasswordResetConfirmView(View):
    template_name = 'citosis/password_reset_confirm.html'

    def get_challenge(self, token):
        return get_active_challenge_by_token(token, AuthChallenge.PurposeChoices.PASSWORD_RESET)

    def get(self, request, token):
        challenge = self.get_challenge(token)
        if not challenge:
            return render(request, self.template_name, {'error': 'This password reset link is invalid or expired.'})
        return render(request, self.template_name, {'error': None})

    def post(self, request, token):
        challenge = self.get_challenge(token)
        if not challenge:
            return render(request, self.template_name, {'error': 'This password reset link is invalid or expired.'})

        user = challenge.user
        password1 = request.POST.get('password1', '')
        password2 = request.POST.get('password2', '')
        if not password1 or not password2:
            return render(request, self.template_name, {'error': 'Please enter and confirm your new password.'})
        if password1 != password2:
            return render(request, self.template_name, {'error': 'Passwords do not match.'})
        try:
            password_validation.validate_password(password1, user=user)
        except DjangoValidationError as exc:
            return render(request, self.template_name, {'error': ' '.join(exc.messages)})

        user.set_password(password1)
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save(update_fields=['password', 'failed_login_attempts', 'locked_until', 'updated_at'])
        mark_email_verified(user)
        mark_challenge_used(challenge)
        log_action(user, 'Reset password', 'Completed password reset via email link.', request)
        success_message = (
            'Password updated successfully. Your email is verified. Wait for Super Admin approval before signing in.'
            if user.status == UserStatusChoices.PENDING_APPROVAL
            else 'Password updated successfully. You can now sign in.'
        )
        return render(request, self.template_name, {'success': success_message})


class SetPasswordView(View):
    template_name = 'citosis/set_password.html'
    token_generator = PasswordResetTokenGenerator()

    def get_user(self, uidb64):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
        except (TypeError, ValueError, OverflowError):
            return None
        return User.all_objects.filter(pk=uid).first()

    def get(self, request, uidb64, token):
        user = self.get_user(uidb64)
        if not user or not self.token_generator.check_token(user, token):
            return render(request, self.template_name, {'error': 'This password setup link is invalid or expired.'})
        return render(request, self.template_name, {'error': None})

    def post(self, request, uidb64, token):
        user = self.get_user(uidb64)
        if not user or not self.token_generator.check_token(user, token):
            return render(request, self.template_name, {'error': 'This password setup link is invalid or expired.'})

        password1 = request.POST.get('password1', '')
        password2 = request.POST.get('password2', '')
        if not password1 or not password2:
            return render(request, self.template_name, {'error': 'Please enter and confirm your new password.'})
        if password1 != password2:
            return render(request, self.template_name, {'error': 'Passwords do not match.'})
        try:
            password_validation.validate_password(password1, user=user)
        except DjangoValidationError as exc:
            return render(request, self.template_name, {'error': ' '.join(exc.messages)})

        user.set_password(password1)
        user.status = UserStatusChoices.ACTIVE
        user.is_active = True
        user.deleted_at = None
        user.failed_login_attempts = 0
        user.locked_until = None
        if not user.email_verified_at:
            user.email_verified_at = timezone.now()
        user.save(
            update_fields=[
                'password',
                'status',
                'is_active',
                'deleted_at',
                'failed_login_attempts',
                'locked_until',
                'email_verified_at',
                'updated_at',
            ]
        )
        log_action(user, 'Set password', 'Completed initial password setup.', request)
        return render(request, self.template_name, {'success': 'Password updated successfully. You can now log in.'})

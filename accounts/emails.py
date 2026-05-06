from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _get_app_url():
    return getattr(settings, 'APP_URL', 'http://localhost:8000').rstrip('/')


def send_account_setup_email(user):
    if not user or not user.email:
        return

    app_url = _get_app_url()
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = PasswordResetTokenGenerator().make_token(user)
    setup_link = f'{app_url}/set-password/{uid}/{token}/'

    subject = 'Your CITOSIS PRO account'
    message = (
        f'Hello {user.name or user.username},\n\n'
        'Your CITOSIS PRO account has been created.\n'
        f'Username: {user.username}\n'
        f'Set your password here: {setup_link}\n\n'
        'If you did not expect this email, please contact your administrator.'
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def send_email_verification_email(user, challenge):
    if not user or not user.email or not challenge:
        return

    verification_link = f'{_get_app_url()}/verify-email/{challenge.token}/'
    subject = 'Verify your CITOSIS PRO email'
    message = (
        f'Hello {user.name or user.username},\n\n'
        'Please verify your email address for your CITOSIS PRO account.\n'
        f'Open this link to verify your email: {verification_link}\n\n'
        'After your email is verified and your account is approved by a Super Admin, you can sign in.\n'
        'If you did not request this, you can ignore this email.'
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


def send_password_reset_email(user, challenge):
    if not user or not user.email or not challenge:
        return

    reset_link = f'{_get_app_url()}/reset-password/{challenge.token}/'
    subject = 'Reset your CITOSIS PRO password'
    message = (
        f'Hello {user.name or user.username},\n\n'
        'We received a request to reset your CITOSIS PRO password.\n'
        f'Use this link to reset it: {reset_link}\n\n'
        'If you did not request a password reset, you can ignore this email.'
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


def send_two_factor_code_email(user, code):
    if not user or not user.email or not code:
        return

    subject = 'Your CITOSIS PRO verification code'
    message = (
        f'Hello {user.name or user.username},\n\n'
        'Use this verification code to finish signing in to CITOSIS PRO:\n'
        f'{code}\n\n'
        'This code expires soon. If you did not try to sign in, change your password immediately.'
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


def send_registration_approved_email(user):
    if not user or not user.email:
        return

    subject = 'Your CITOSIS PRO account has been approved'
    message = (
        f'Hello {user.name or user.username},\n\n'
        'Your CITOSIS PRO account request has been approved by a Super Admin.\n'
        'If your email is already verified, you can sign in now.\n'
        'If your email is not verified yet, please use the latest verification email in your inbox first.'
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)

import json
from html import escape
from urllib import error, request

from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _get_app_url():
    return getattr(settings, 'APP_URL', 'http://localhost:8000').rstrip('/')


def _render_basic_html(message):
    paragraphs = [segment.strip() for segment in str(message or '').split('\n\n') if segment.strip()]
    if not paragraphs:
        return '<p></p>'
    return ''.join(f'<p>{escape(paragraph).replace(chr(10), "<br>")}</p>' for paragraph in paragraphs)


def _send_via_resend(subject, message, recipient_list):
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    if not api_key:
        raise RuntimeError('RESEND_API_KEY is not configured.')

    payload = json.dumps(
        {
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': list(recipient_list),
            'subject': subject,
            'text': message,
            'html': _render_basic_html(message),
        }
    ).encode('utf-8')
    http_request = request.Request(
        getattr(settings, 'RESEND_API_URL', 'https://api.resend.com/emails'),
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    timeout = int(getattr(settings, 'EMAIL_TIMEOUT', 10))
    try:
        with request.urlopen(http_request, timeout=timeout) as response:
            response.read()
    except error.HTTPError as exc:
        response_body = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Resend API rejected the email request: {response_body}') from exc
    except error.URLError as exc:
        raise RuntimeError(f'Resend API request failed: {exc.reason}') from exc


def _send_app_email(subject, message, recipient_list):
    delivery_method = getattr(settings, 'EMAIL_DELIVERY_METHOD', 'smtp')
    if delivery_method == 'resend':
        _send_via_resend(subject, message, recipient_list)
        return

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list,
        fail_silently=False,
    )


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

    _send_app_email(subject, message, [user.email])


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
    _send_app_email(subject, message, [user.email])


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
    _send_app_email(subject, message, [user.email])


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
    _send_app_email(subject, message, [user.email])


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
    _send_app_email(subject, message, [user.email])

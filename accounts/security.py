from __future__ import annotations

import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from accounts.models import AuthChallenge, User
from citosis_pro.common import RoleChoices, normalize_role_value


def get_login_failure_limit() -> int:
    return max(1, int(getattr(settings, 'LOGIN_FAILURE_LIMIT', 5)))


def get_login_lockout_minutes() -> int:
    return max(1, int(getattr(settings, 'LOGIN_LOCKOUT_MINUTES', 15)))


def get_email_verification_expiry_hours() -> int:
    return max(1, int(getattr(settings, 'EMAIL_VERIFICATION_EXPIRY_HOURS', 48)))


def get_password_reset_expiry_minutes() -> int:
    return max(5, int(getattr(settings, 'PASSWORD_RESET_EXPIRY_MINUTES', 60)))


def get_super_admin_2fa_expiry_minutes() -> int:
    return max(1, int(getattr(settings, 'SUPER_ADMIN_2FA_EXPIRY_MINUTES', 10)))


def is_super_admin_user(user: User | None) -> bool:
    if not user:
        return False
    return user.is_superuser or normalize_role_value(user.role) == RoleChoices.SUPER_ADMIN


def mask_email_address(email: str) -> str:
    value = str(email or '').strip()
    if '@' not in value:
        return value
    local_part, domain = value.split('@', 1)
    if len(local_part) <= 2:
        masked_local = f'{local_part[:1]}*'
    else:
        masked_local = f'{local_part[:2]}{"*" * max(1, len(local_part) - 2)}'
    return f'{masked_local}@{domain}'


def format_lockout_deadline(value) -> str:
    if not value:
        return 'soon'
    return timezone.localtime(value).strftime('%b %d, %Y at %I:%M %p')


def clear_login_lockout(user: User) -> User:
    if not user.failed_login_attempts and not user.locked_until:
        return user
    user.failed_login_attempts = 0
    user.locked_until = None
    user.save(update_fields=['failed_login_attempts', 'locked_until', 'updated_at'])
    return user


def record_failed_login(user: User) -> tuple[User, bool]:
    now = timezone.now()
    if user.locked_until and user.locked_until <= now:
        user.failed_login_attempts = 0
        user.locked_until = None

    user.failed_login_attempts = int(user.failed_login_attempts or 0) + 1
    is_now_locked = user.failed_login_attempts >= get_login_failure_limit()
    if is_now_locked:
        user.locked_until = now + timedelta(minutes=get_login_lockout_minutes())
        user.failed_login_attempts = 0
        user.save(update_fields=['failed_login_attempts', 'locked_until', 'updated_at'])
    else:
        user.save(update_fields=['failed_login_attempts', 'updated_at'])
    return user, is_now_locked


def mark_email_verified(user: User) -> User:
    if user.email_verified_at:
        return user
    user.email_verified_at = timezone.now()
    user.save(update_fields=['email_verified_at', 'updated_at'])
    return user


def _create_challenge(user: User, purpose: str, expires_at, code: str = '') -> AuthChallenge:
    AuthChallenge.objects.filter(
        user=user,
        purpose=purpose,
        used_at__isnull=True,
    ).delete()
    challenge = AuthChallenge.objects.create(
        user=user,
        purpose=purpose,
        token=secrets.token_urlsafe(32),
        code_hash=make_password(code) if code else '',
        expires_at=expires_at,
    )
    return challenge


def issue_email_verification_challenge(user: User) -> AuthChallenge:
    expires_at = timezone.now() + timedelta(hours=get_email_verification_expiry_hours())
    return _create_challenge(user, AuthChallenge.PurposeChoices.EMAIL_VERIFICATION, expires_at)


def issue_password_reset_challenge(user: User) -> AuthChallenge:
    expires_at = timezone.now() + timedelta(minutes=get_password_reset_expiry_minutes())
    return _create_challenge(user, AuthChallenge.PurposeChoices.PASSWORD_RESET, expires_at)


def issue_super_admin_two_factor_challenge(user: User) -> tuple[AuthChallenge, str]:
    expires_at = timezone.now() + timedelta(minutes=get_super_admin_2fa_expiry_minutes())
    code = f'{secrets.randbelow(1000000):06d}'
    challenge = _create_challenge(user, AuthChallenge.PurposeChoices.SUPER_ADMIN_2FA, expires_at, code=code)
    return challenge, code


def get_active_challenge_by_token(token: str, purpose: str) -> AuthChallenge | None:
    challenge = AuthChallenge.objects.select_related('user').filter(
        token=str(token or '').strip(),
        purpose=purpose,
        used_at__isnull=True,
    ).first()
    if not challenge or challenge.expires_at <= timezone.now():
        return None
    return challenge


def get_active_two_factor_challenge(challenge_id) -> AuthChallenge | None:
    challenge = AuthChallenge.objects.select_related('user').filter(
        pk=challenge_id,
        purpose=AuthChallenge.PurposeChoices.SUPER_ADMIN_2FA,
        used_at__isnull=True,
    ).first()
    if not challenge or challenge.expires_at <= timezone.now():
        return None
    return challenge


def verify_two_factor_code(challenge: AuthChallenge, code: str) -> bool:
    if not challenge or challenge.purpose != AuthChallenge.PurposeChoices.SUPER_ADMIN_2FA:
        return False
    if not challenge.code_hash or not check_password(str(code or '').strip(), challenge.code_hash):
        challenge.attempt_count = int(challenge.attempt_count or 0) + 1
        update_fields = ['attempt_count', 'updated_at']
        if challenge.attempt_count >= 5:
            challenge.used_at = timezone.now()
            update_fields.append('used_at')
        challenge.save(update_fields=update_fields)
        return False
    return True


def mark_challenge_used(challenge: AuthChallenge) -> AuthChallenge:
    challenge.used_at = timezone.now()
    challenge.save(update_fields=['used_at', 'updated_at'])
    return challenge

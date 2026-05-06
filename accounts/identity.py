from django.utils import timezone


DELETED_IDENTITY_DOMAIN = 'deleted.citosis.local'


def build_deleted_identity(user):
    timestamp = timezone.now().strftime('%Y%m%d%H%M%S%f')
    suffix = f'{user.pk}-{timestamp}'
    return {
        'email': f'deleted-user-{suffix}@{DELETED_IDENTITY_DOMAIN}',
        'username': f'deleted-user-{suffix}'[:150],
    }


def tombstone_user_identity(user):
    identity = build_deleted_identity(user)
    changed_fields = []
    if user.email and not user.email.endswith(f'@{DELETED_IDENTITY_DOMAIN}'):
        user.email = identity['email']
        changed_fields.append('email')
    if user.username and not user.username.startswith('deleted-user-'):
        user.username = identity['username']
        changed_fields.append('username')
    return changed_fields


def tombstone_deleted_users_with_email(email):
    from accounts.models import User

    normalized = User.objects.normalize_email(email).lower()
    users = User.all_objects.filter(email__iexact=normalized, deleted_at__isnull=False)
    for user in users:
        changed_fields = tombstone_user_identity(user)
        if changed_fields:
            user.save(update_fields=[*changed_fields, 'updated_at', 'is_active', 'is_staff'])

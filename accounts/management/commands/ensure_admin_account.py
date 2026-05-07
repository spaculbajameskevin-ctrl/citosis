import os

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from citosis_pro.common import RoleChoices, UserStatusChoices


class Command(BaseCommand):
    help = 'Create or update an admin account from environment variables.'

    def handle(self, *args, **options):
        email = os.getenv('ADMIN_EMAIL', '').strip().lower()
        password = os.getenv('ADMIN_PASSWORD', '').strip()

        if not email or not password:
            self.stdout.write('Skipping admin sync: ADMIN_EMAIL or ADMIN_PASSWORD is not set.')
            return

        username = os.getenv('ADMIN_USERNAME', email.split('@', 1)[0]).strip() or email.split('@', 1)[0]
        name = os.getenv('ADMIN_NAME', 'System Administrator').strip() or 'System Administrator'
        office = os.getenv('ADMIN_OFFICE', 'Tourism Office').strip()

        user = User.all_objects.filter(email__iexact=email).first()
        created = user is None
        if created:
            user = User(email=email)

        user.email = email
        user.username = username
        user.name = name
        user.office = office
        user.role = RoleChoices.SUPER_ADMIN
        user.status = UserStatusChoices.ACTIVE
        user.is_staff = True
        user.is_superuser = True
        user.deleted_at = None
        user.email_verified_at = user.email_verified_at or timezone.now()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.set_password(password)
        user.save()

        action = 'created' if created else 'updated'
        self.stdout.write(self.style.SUCCESS(f'Admin account {action}: {user.email} / {user.username}'))

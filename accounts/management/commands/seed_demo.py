from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from citosis_pro.common import RoleChoices, UserStatusChoices


class Command(BaseCommand):
    help = 'Create or update the demo admin account.'

    def handle(self, *args, **options):
        user = User.all_objects.filter(Q(username__iexact='admin') | Q(email__iexact='admin@example.com')).first()
        created = user is None
        if created:
            user = User(email='admin@example.com')

        user.username = 'admin'
        user.name = 'System Administrator'
        user.office = 'Tourism Office'
        user.role = RoleChoices.SUPER_ADMIN
        user.status = UserStatusChoices.ACTIVE
        user.is_staff = True
        user.is_superuser = True
        user.deleted_at = None
        user.email_verified_at = user.email_verified_at or timezone.now()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.set_password('TempPass123!')
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS('Demo admin account created: admin / TempPass123!'))
        else:
            self.stdout.write(self.style.SUCCESS('Demo admin account updated: admin / TempPass123!'))

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User


class Command(BaseCommand):
    help = 'Bulk verify all user emails. Useful for setting up existing users with email verification.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--unverified-only',
            action='store_true',
            help='Only verify users whose emails have not been verified yet',
        )

    def handle(self, *args, **options):
        unverified_only = options.get('unverified_only', False)

        # Get users to verify
        if unverified_only:
            users = User.all_objects.filter(email_verified_at__isnull=True, deleted_at__isnull=True)
        else:
            users = User.all_objects.filter(deleted_at__isnull=True)

        total_users = users.count()
        if total_users == 0:
            self.stdout.write(self.style.WARNING('No users to verify.'))
            return

        # Verify users
        now = timezone.now()
        verified_count = 0

        for user in users:
            if not user.email_verified_at:
                user.email_verified_at = now
                user.save(update_fields=['email_verified_at', 'updated_at'])
                verified_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Successfully verified {verified_count} user(s) out of {total_users} total.'
            )
        )

        if verified_count > 0:
            self.stdout.write(self.style.SUCCESS(f'All users can now login!'))

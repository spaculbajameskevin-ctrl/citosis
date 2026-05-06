from django.contrib.auth.base_user import BaseUserManager
from django.utils import timezone

from citosis_pro.common import RoleChoices, UserStatusChoices


class UserManager(BaseUserManager):
    use_in_migrations = True

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The email field is required.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('is_staff', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('role', RoleChoices.SUPER_ADMIN)
        extra_fields.setdefault('status', UserStatusChoices.ACTIVE)
        extra_fields.setdefault('email_verified_at', timezone.now())

        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        return self._create_user(email, password, **extra_fields)

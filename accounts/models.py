import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from accounts.managers import UserManager
from citosis_pro.common import RoleChoices, TimestampedSoftDeleteModel, UserStatusChoices, can_manage_users


class User(TimestampedSoftDeleteModel, AbstractBaseUser, PermissionsMixin):
    id = models.BigAutoField(primary_key=True)
    username = models.CharField(max_length=150, unique=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    office = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=RoleChoices.choices, default=RoleChoices.USER)
    status = models.CharField(max_length=20, choices=UserStatusChoices.choices, default=UserStatusChoices.ACTIVE)
    remember_token = models.CharField(max_length=255, blank=True, null=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()
    all_objects = models.Manager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name']

    class Meta:
        ordering = ['name', 'email']
        db_table = 'users'

    def __str__(self):
        return self.name or self.email

    @property
    def is_email_verified(self):
        return bool(self.email_verified_at)

    @property
    def is_locked(self):
        return bool(self.locked_until and self.locked_until > timezone.now())

    def save(self, *args, **kwargs):
        self.is_active = self.deleted_at is None and self.status == UserStatusChoices.ACTIVE
        if self.is_superuser:
            self.is_staff = True
        elif can_manage_users(self.role):
            self.is_staff = True
        else:
            self.is_staff = False
        super().save(*args, **kwargs)


class Establishment(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        db_table = 'establishments'

    def __str__(self):
        return self.name


class AuthChallenge(models.Model):
    class PurposeChoices(models.TextChoices):
        EMAIL_VERIFICATION = 'email_verification', 'Email Verification'
        PASSWORD_RESET = 'password_reset', 'Password Reset'
        SUPER_ADMIN_2FA = 'super_admin_2fa', 'Super Admin 2FA'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_challenges')
    purpose = models.CharField(max_length=40, choices=PurposeChoices.choices)
    token = models.CharField(max_length=96, unique=True, db_index=True)
    code_hash = models.CharField(max_length=255, blank=True)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'auth_challenges'

    def __str__(self):
        return f'{self.user.email} - {self.purpose}'

    @property
    def is_active(self):
        return self.used_at is None and self.expires_at > timezone.now()

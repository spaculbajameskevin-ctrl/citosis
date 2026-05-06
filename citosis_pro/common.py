from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.db import models


class RoleChoices(models.TextChoices):
    SUPER_ADMIN = 'Super Admin', 'Super Admin'
    REVIEWER = 'Reviewer', 'Reviewer'
    VIEWER = 'Viewer', 'Viewer'
    USER = 'User', 'User'


LEGACY_ROLE_TO_CANONICAL = {
    'Admin': RoleChoices.SUPER_ADMIN,
    'Manager': RoleChoices.REVIEWER,
    'Encoder': RoleChoices.REVIEWER,
    'Staff': RoleChoices.USER,
}

ADMIN_DASHBOARD_ROLES = frozenset({
    RoleChoices.SUPER_ADMIN,
    RoleChoices.REVIEWER,
    RoleChoices.VIEWER,
})
DATA_EDITOR_ROLES = frozenset({
    RoleChoices.SUPER_ADMIN,
    RoleChoices.REVIEWER,
})
SUBMISSION_APPROVER_ROLES = frozenset({
    RoleChoices.SUPER_ADMIN,
    RoleChoices.REVIEWER,
})
DELETE_ROLES = frozenset({
    RoleChoices.SUPER_ADMIN,
})
USER_MANAGEMENT_ROLES = frozenset({
    RoleChoices.SUPER_ADMIN,
})


def normalize_role_value(user_or_role: Any) -> str:
    raw_role = getattr(user_or_role, 'role', user_or_role)
    normalized_role = str(raw_role or '').strip()
    return LEGACY_ROLE_TO_CANONICAL.get(normalized_role, normalized_role)


def can_access_admin_dashboard(user_or_role: Any) -> bool:
    return normalize_role_value(user_or_role) in ADMIN_DASHBOARD_ROLES


def can_edit_data(user_or_role: Any) -> bool:
    return normalize_role_value(user_or_role) in DATA_EDITOR_ROLES


def can_approve_submissions(user_or_role: Any) -> bool:
    return normalize_role_value(user_or_role) in SUBMISSION_APPROVER_ROLES


def can_delete_data(user_or_role: Any) -> bool:
    return normalize_role_value(user_or_role) in DELETE_ROLES


def can_manage_users(user_or_role: Any) -> bool:
    return normalize_role_value(user_or_role) in USER_MANAGEMENT_ROLES


class UserStatusChoices(models.TextChoices):
    PENDING_APPROVAL = 'Pending Approval', 'Pending Approval'
    ACTIVE = 'Active', 'Active'
    INACTIVE = 'Inactive', 'Inactive'


class RecordCategoryChoices(models.TextChoices):
    BEACH = 'Beach', 'Beach'
    MOUNTAIN = 'Mountain', 'Mountain'
    HERITAGE = 'Heritage', 'Heritage'
    NATURE = 'Nature', 'Nature'
    PARK = 'Park', 'Park'
    EVENT = 'Event', 'Event'
    OTHER = 'Other', 'Other'


class VisitorStatusChoices(models.TextChoices):
    CHECKED_IN = 'Checked In', 'Checked In'
    CHECKED_OUT = 'Checked Out', 'Checked Out'


class RecycleItemTypeChoices(models.TextChoices):
    RECORD = 'record', 'Record'
    VISITOR = 'visitor', 'Visitor'
    USER = 'user', 'User'


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def deleted(self):
        return self.filter(deleted_at__isnull=False)


class ActiveManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()


class TimestampedSoftDeleteModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = ActiveManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True


def serialize_instance(instance: models.Model) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.attname)
        if isinstance(value, datetime):
            payload[field.attname] = value.isoformat()
        elif isinstance(value, date):
            payload[field.attname] = value.isoformat()
        elif isinstance(value, Decimal):
            payload[field.attname] = str(value)
        elif hasattr(value, 'name'):
            payload[field.attname] = value.name or None
        else:
            payload[field.attname] = value
    return payload

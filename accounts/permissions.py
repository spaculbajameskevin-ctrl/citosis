from rest_framework.permissions import BasePermission

from citosis_pro.common import (
    UserStatusChoices,
    can_access_admin_dashboard,
    can_approve_submissions,
    can_delete_data,
    can_edit_data,
    can_manage_users,
)


class IsActiveSystemUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
        )


class IsAdminDashboardUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
            and can_access_admin_dashboard(user)
        )


class CanEditDataPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
            and can_edit_data(user)
        )


class CanApproveSubmissionPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
            and can_approve_submissions(user)
        )


class CanDeleteDataPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
            and can_delete_data(user)
        )


class IsSuperAdminOnly(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
            and can_manage_users(user)
        )


class IsSubmissionWorkspaceAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not (
            user
            and user.is_authenticated
            and user.deleted_at is None
            and user.status == UserStatusChoices.ACTIVE
        ):
            return False
        if request.method in {'GET', 'HEAD', 'OPTIONS'}:
            return can_access_admin_dashboard(user)
        return can_edit_data(user)


IsAdminOrManager = IsAdminDashboardUser
IsAdminOnly = IsSuperAdminOnly

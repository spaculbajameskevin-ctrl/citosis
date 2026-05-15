from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from accounts.models import AuthChallenge, Establishment, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ('id', 'username', 'email', 'name', 'office', 'role', 'status', 'email_verified_at', 'locked_until', 'deleted_at')
    ordering = ('email',)
    search_fields = ('email', 'username', 'name', 'office')
    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal info', {'fields': ('name', 'office', 'role', 'status', 'remember_token', 'email_verified_at')}),
        ('Security', {'fields': ('failed_login_attempts', 'locked_until')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at', 'deleted_at')}),
    )
    readonly_fields = ('created_at', 'updated_at', 'deleted_at', 'last_login', 'email_verified_at', 'failed_login_attempts', 'locked_until')
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'name', 'office', 'role', 'status', 'password1', 'password2'),
        }),
    )


@admin.register(AuthChallenge)
class AuthChallengeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'purpose', 'expires_at', 'used_at', 'attempt_count', 'created_at')
    search_fields = ('user__email', 'user__username', 'token')
    list_filter = ('purpose', 'used_at')
    readonly_fields = ('id', 'token', 'code_hash', 'attempt_count', 'created_at', 'updated_at')


@admin.register(Establishment)
class EstablishmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at', 'updated_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')

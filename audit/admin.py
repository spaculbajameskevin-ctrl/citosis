from django.contrib import admin

from audit.models import ActivityLog, DataSubmission, RecycleBin, SubmissionNotification


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'user', 'ip_address', 'created_at')
    search_fields = ('action', 'details', 'user__email', 'user__username', 'user__name')
    list_filter = ('created_at',)


@admin.register(RecycleBin)
class RecycleBinAdmin(admin.ModelAdmin):
    list_display = ('id', 'item_type', 'item_id', 'deleted_by', 'deleted_at', 'restored_at')
    search_fields = ('item_type', 'item_id')
    list_filter = ('item_type', 'deleted_at', 'restored_at')


@admin.register(DataSubmission)
class DataSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'original_filename', 'submitted_by', 'status', 'version_number', 'updated_at')
    search_fields = ('original_filename', 'sheet_name', 'submitted_by__email', 'submitted_by__name')
    list_filter = ('status', 'created_at', 'updated_at')


@admin.register(SubmissionNotification)
class SubmissionNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'notification_type', 'title', 'recipient', 'created_by', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'recipient__email', 'recipient__name', 'created_by__email', 'created_by__name')
    list_filter = ('notification_type', 'is_read', 'created_at')

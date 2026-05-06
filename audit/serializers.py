from rest_framework import serializers

from audit.models import ActivityLog, DataSubmission, RecycleBin, SubmissionNotification
from audit.services import build_submission_priority_metadata


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'user_name', 'user_username', 'action', 'details', 'ip_address', 'user_agent', 'created_at']


class RecycleBinSerializer(serializers.ModelSerializer):
    deleted_by_name = serializers.CharField(source='deleted_by.name', read_only=True)
    restored_by_name = serializers.CharField(source='restored_by.name', read_only=True)
    item_name = serializers.SerializerMethodField()

    class Meta:
        model = RecycleBin
        fields = [
            'id',
            'item_type',
            'item_id',
            'item_data',
            'item_name',
            'deleted_by',
            'deleted_by_name',
            'deleted_at',
            'restored_at',
            'restored_by',
            'restored_by_name',
        ]

    def get_item_name(self, obj):
        payload = obj.item_data or {}
        return payload.get('name') or payload.get('username') or payload.get('email') or f'Item {obj.item_id}'


class DataSubmissionSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source='submitted_by.name', read_only=True)
    submitted_by_email = serializers.CharField(source='submitted_by.email', read_only=True)
    submitted_by_office = serializers.CharField(source='submitted_by.office', read_only=True)
    file_url = serializers.SerializerMethodField()
    version_label = serializers.SerializerMethodField()
    mapping_profile_label = serializers.SerializerMethodField()
    last_reviewed_by_name = serializers.CharField(source='last_reviewed_by.name', read_only=True)
    last_reviewed_by_email = serializers.CharField(source='last_reviewed_by.email', read_only=True)
    review_history_count = serializers.SerializerMethodField()
    is_high_priority = serializers.SerializerMethodField()
    priority_reason = serializers.SerializerMethodField()

    class Meta:
        model = DataSubmission
        fields = [
            'id',
            'submitted_by',
            'submitted_by_name',
            'submitted_by_email',
            'submitted_by_office',
            'file',
            'file_url',
            'original_filename',
            'sheet_name',
            'headers',
            'preview_rows',
            'total_rows',
            'total_columns',
            'mapping_profile_key',
            'mapping_profile_label',
            'column_mapping',
            'submission_notes',
            'admin_feedback',
            'version_number',
            'version_label',
            'status',
            'last_reviewed_by',
            'last_reviewed_by_name',
            'last_reviewed_by_email',
            'last_reviewed_at',
            'review_history_count',
            'is_high_priority',
            'priority_reason',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None

    def get_version_label(self, obj):
        return f'v{obj.version_number}'

    def get_mapping_profile_label(self, obj):
        labels = {
            'visitor': 'Visitor Sheet',
            'record': 'Tourism Record Sheet',
        }
        return labels.get(obj.mapping_profile_key or '', '')

    def get_review_history_count(self, obj):
        return len(obj.review_history or [])

    def get_is_high_priority(self, obj):
        return build_submission_priority_metadata(obj)['is_high_priority']

    def get_priority_reason(self, obj):
        return build_submission_priority_metadata(obj)['priority_reason']


class SubmissionNotificationSerializer(serializers.ModelSerializer):
    submission_id = serializers.SerializerMethodField()
    submission_filename = serializers.SerializerMethodField()
    submission_sheet_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    recipient_email = serializers.SerializerMethodField()
    recipient_office = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SubmissionNotification
        fields = [
            'id',
            'recipient',
            'recipient_name',
            'recipient_email',
            'recipient_office',
            'submission_id',
            'submission_filename',
            'submission_sheet_name',
            'notification_type',
            'title',
            'message',
            'status_snapshot',
            'metadata',
            'created_by_name',
            'is_read',
            'created_at',
            'read_at',
        ]
        read_only_fields = fields

    def get_submission_id(self, obj):
        return obj.submission_id

    def get_submission_filename(self, obj):
        return obj.submission.original_filename if obj.submission_id and obj.submission else ''

    def get_submission_sheet_name(self, obj):
        return obj.submission.sheet_name if obj.submission_id and obj.submission else ''

    def get_recipient_name(self, obj):
        if not obj.recipient_id or not obj.recipient:
            return ''
        return obj.recipient.name or obj.recipient.username or obj.recipient.email

    def get_recipient_email(self, obj):
        return obj.recipient.email if obj.recipient_id and obj.recipient else ''

    def get_recipient_office(self, obj):
        return obj.recipient.office if obj.recipient_id and obj.recipient else ''

    def get_created_by_name(self, obj):
        if not obj.created_by_id or not obj.created_by:
            return ''
        return obj.created_by.name or obj.created_by.email or obj.created_by.username

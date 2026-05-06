from django.conf import settings
from django.db import models

from citosis_pro.common import RecycleItemTypeChoices


class ActivityLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='activity_logs')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, null=True)
    ip_address = models.CharField(max_length=255, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.action


class RecycleBin(models.Model):
    id = models.BigAutoField(primary_key=True)
    item_type = models.CharField(max_length=20, choices=RecycleItemTypeChoices.choices)
    item_id = models.CharField(max_length=255)
    item_data = models.JSONField()
    deleted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='recycle_deleted_items')
    deleted_at = models.DateTimeField(auto_now_add=True)
    restored_at = models.DateTimeField(blank=True, null=True)
    restored_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, blank=True, null=True, related_name='recycle_restored_items')

    class Meta:
        db_table = 'recycle_bin'
        ordering = ['-deleted_at', '-id']

    def __str__(self):
        return f'{self.item_type}:{self.item_id}'


class DataSubmission(models.Model):
    STATUS_DRAFT = 'Draft'
    STATUS_PENDING = 'Pending'
    STATUS_IN_REVIEW = 'In Review'
    STATUS_NEEDS_REVISION = 'Needs Revision'
    STATUS_APPROVED = 'Approved'
    STATUS_REJECTED = 'Rejected'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PENDING, 'Pending'),
        (STATUS_IN_REVIEW, 'In Review'),
        (STATUS_NEEDS_REVISION, 'Needs Revision'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    id = models.BigAutoField(primary_key=True)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='data_submissions')
    file = models.FileField(upload_to='data_submissions/')
    original_filename = models.CharField(max_length=255)
    sheet_name = models.CharField(max_length=255, blank=True)
    headers = models.JSONField(default=list, blank=True)
    preview_rows = models.JSONField(default=list, blank=True)
    total_rows = models.PositiveIntegerField(default=0)
    total_columns = models.PositiveIntegerField(default=0)
    mapping_profile_key = models.CharField(max_length=50, blank=True)
    column_mapping = models.JSONField(default=dict, blank=True)
    submission_notes = models.TextField(blank=True)
    admin_feedback = models.TextField(blank=True)
    version_number = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    review_history = models.JSONField(default=list, blank=True)
    last_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='reviewed_data_submissions',
    )
    last_reviewed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'data_submissions'
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.original_filename} v{self.version_number} ({self.submitted_by_id})'


class SubmissionNotification(models.Model):
    TYPE_SUBMISSION = 'Submission'
    TYPE_DATA_REQUEST = 'Data Request'
    TYPE_USER_REGISTRATION = 'User Registration'
    TYPE_CHOICES = [
        (TYPE_SUBMISSION, 'Submission'),
        (TYPE_DATA_REQUEST, 'Data Request'),
        (TYPE_USER_REGISTRATION, 'User Registration'),
    ]

    id = models.BigAutoField(primary_key=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submission_notifications')
    submission = models.ForeignKey(DataSubmission, on_delete=models.CASCADE, related_name='notifications', blank=True, null=True)
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_SUBMISSION)
    title = models.CharField(max_length=255)
    message = models.TextField()
    status_snapshot = models.CharField(max_length=20, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='created_submission_notifications',
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'submission_notifications'
        ordering = ['is_read', '-created_at', '-id']

    def __str__(self):
        return f'{self.title} -> {self.recipient_id}'

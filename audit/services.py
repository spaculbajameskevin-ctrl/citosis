from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db import models
from django.db.models import DateTimeField, Field
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from accounts.identity import tombstone_user_identity
from accounts.models import User
from audit.models import ActivityLog, DataSubmission, RecycleBin, SubmissionNotification
from citosis_pro.common import (
    RecycleItemTypeChoices,
    RoleChoices,
    UserStatusChoices,
    can_access_admin_dashboard,
    normalize_role_value,
    serialize_instance,
)
from tourism.models import TourismRecord, Visitor

SUBMISSION_PRIORITY_KEYWORD_MAP = {
    'high priority': 'submission notes',
    'high-priority': 'submission notes',
    'urgent': 'submission notes',
    'asap': 'submission notes',
    'rush': 'submission notes',
    'important': 'submission notes',
    'priority': 'submission notes',
    'immediate': 'submission notes',
}


def get_request_meta(request):
    if not request:
        return None, None
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        ip_address = forwarded_for.split(',')[0].strip()
    else:
        ip_address = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT')
    return ip_address, user_agent


def log_action(user, action, details='', request=None):
    ip_address, user_agent = get_request_meta(request)
    return ActivityLog.objects.create(
        user=user if getattr(user, 'is_authenticated', False) else None,
        action=action,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def build_submission_status_title(submission: DataSubmission):
    titles = {
        DataSubmission.STATUS_PENDING: 'Your Excel submission is pending',
        DataSubmission.STATUS_IN_REVIEW: 'Your Excel submission is now in review',
        DataSubmission.STATUS_NEEDS_REVISION: 'Action required on your Excel submission',
        DataSubmission.STATUS_APPROVED: 'Your Excel submission was approved',
        DataSubmission.STATUS_REJECTED: 'Your Excel submission was rejected',
    }
    return titles.get(submission.status, 'Your Excel submission was updated')


def build_submission_status_message(submission: DataSubmission):
    version_label = f'v{submission.version_number}'
    sheet_label = f' on sheet "{submission.sheet_name}"' if submission.sheet_name else ''
    message = (
        f'File "{submission.original_filename}" {version_label}{sheet_label} '
        f'is now marked as {submission.status}.'
    )
    if submission.status in {DataSubmission.STATUS_NEEDS_REVISION, DataSubmission.STATUS_REJECTED} and submission.admin_feedback:
        message += f' Reason: {submission.admin_feedback}'
    return message


def send_submission_status_email(submission: DataSubmission, title: str, message: str):
    recipient = getattr(submission, 'submitted_by', None)
    if not recipient or not recipient.email:
        return

    app_url = getattr(settings, 'APP_URL', 'http://localhost:8000').rstrip('/')
    sheet_label = submission.sheet_name or 'Unknown sheet'
    email_lines = [
        f'Hello {recipient.name or recipient.username},',
        '',
        title,
        message,
        '',
        f'File: {submission.original_filename}',
        f'Sheet: {sheet_label}',
        f'Current status: {submission.status}',
        f'Open CITOSIS PRO: {app_url}/',
    ]

    send_mail(
        f'CITOSIS PRO submission update: {submission.original_filename}',
        '\n'.join(email_lines),
        settings.DEFAULT_FROM_EMAIL,
        [recipient.email],
        fail_silently=True,
    )


def create_submission_notification(submission: DataSubmission, actor=None):
    title = build_submission_status_title(submission)
    message = build_submission_status_message(submission)
    notification = SubmissionNotification.objects.create(
        recipient=submission.submitted_by,
        submission=submission,
        notification_type=SubmissionNotification.TYPE_SUBMISSION,
        title=title,
        message=message,
        status_snapshot=submission.status,
        created_by=actor if getattr(actor, 'is_authenticated', False) else None,
    )
    send_submission_status_email(submission, title, message)
    return notification


def send_data_request_email(recipient: User, *, actor=None, title: str, message: str, due_date=None):
    if not recipient or not recipient.email:
        return

    app_url = getattr(settings, 'APP_URL', 'http://localhost:8000').rstrip('/')
    actor_label = ''
    if actor is not None and getattr(actor, 'is_authenticated', False):
        actor_label = actor.name or actor.email or actor.username

    email_lines = [
        f'Hello {recipient.name or recipient.username},',
        '',
        title,
        message,
    ]
    if due_date:
        email_lines.extend(['', f'Due date: {due_date}'])
    if actor_label:
        email_lines.extend(['', f'Requested by: {actor_label}'])
    email_lines.extend(['', f'Open CITOSIS PRO: {app_url}/'])

    send_mail(
        f'CITOSIS PRO data request: {title}',
        '\n'.join(email_lines),
        settings.DEFAULT_FROM_EMAIL,
        [recipient.email],
        fail_silently=True,
    )


def create_data_request_notifications(recipients, *, actor=None, title: str, message: str, due_date=None):
    created_notifications = []
    created_by = actor if getattr(actor, 'is_authenticated', False) else None
    metadata = {}
    if due_date:
        metadata['due_date'] = due_date.isoformat() if hasattr(due_date, 'isoformat') else str(due_date)

    for recipient in recipients:
        notification = SubmissionNotification.objects.create(
            recipient=recipient,
            notification_type=SubmissionNotification.TYPE_DATA_REQUEST,
            title=title,
            message=message,
            status_snapshot='',
            metadata=metadata,
            created_by=created_by,
        )
        send_data_request_email(
            recipient,
            actor=actor,
            title=title,
            message=message,
            due_date=metadata.get('due_date'),
        )
        created_notifications.append(notification)

    return created_notifications


def build_user_registration_notification_message(user: User):
    registrant_label = user.name or user.email or user.username or 'A new user'
    office_label = user.office or 'No establishment provided'
    return (
        f'{registrant_label} registered for a CITOSIS PRO account and is waiting for Super Admin approval. '
        f'Email: {user.email}. Establishment: {office_label}.'
    )


def send_user_registration_alert_email(recipient: User, registered_user: User, title: str, message: str):
    if not recipient or not recipient.email:
        return

    app_url = getattr(settings, 'APP_URL', 'http://localhost:8000').rstrip('/')
    email_lines = [
        f'Hello {recipient.name or recipient.username},',
        '',
        title,
        message,
        '',
        f'Name: {registered_user.name or "No name"}',
        f'Username: {registered_user.username or "No username"}',
        f'Email: {registered_user.email or "No email"}',
        f'Establishment: {registered_user.office or "No establishment"}',
        f'Status: {registered_user.status}',
        f'Open CITOSIS PRO: {app_url}/',
    ]

    send_mail(
        'CITOSIS PRO admin notification: New user registration',
        '\n'.join(email_lines),
        settings.DEFAULT_FROM_EMAIL,
        [recipient.email],
        fail_silently=True,
    )


def create_user_registration_notifications(registered_user: User, *, send_email: bool = True):
    recipients = [
        user
        for user in User.objects.filter(
            status=UserStatusChoices.ACTIVE,
            deleted_at__isnull=True,
        ).exclude(pk=registered_user.pk)
        if user.is_superuser or normalize_role_value(user.role) == RoleChoices.SUPER_ADMIN
    ]
    if not recipients:
        return []

    title = 'New user registration'
    message = build_user_registration_notification_message(registered_user)
    metadata = {
        'user_id': registered_user.pk,
        'user_name': registered_user.name or '',
        'user_email': registered_user.email or '',
        'office': registered_user.office or '',
        'status': registered_user.status,
    }
    notifications = [
        SubmissionNotification(
            recipient=recipient,
            notification_type=SubmissionNotification.TYPE_USER_REGISTRATION,
            title=title,
            message=message,
            status_snapshot=registered_user.status,
            metadata=metadata,
        )
        for recipient in recipients
    ]
    created_notifications = SubmissionNotification.objects.bulk_create(notifications)
    if send_email:
        for notification in created_notifications:
            send_user_registration_alert_email(notification.recipient, registered_user, title, message)
    return created_notifications


def build_submission_priority_metadata(submission: DataSubmission):
    filename_text = str(getattr(submission, 'original_filename', '') or '').strip()
    sheet_text = str(getattr(submission, 'sheet_name', '') or '').strip()
    notes_text = str(getattr(submission, 'submission_notes', '') or '').strip()

    searchable_fields = [
        ('file name', filename_text),
        ('sheet name', sheet_text),
        ('submission notes', notes_text),
    ]
    for field_label, raw_value in searchable_fields:
        normalized_value = raw_value.lower()
        if not normalized_value:
            continue
        for keyword in SUBMISSION_PRIORITY_KEYWORD_MAP:
            if keyword in normalized_value:
                reason = f'Keyword "{keyword}" detected in the {field_label}.'
                return {
                    'is_high_priority': True,
                    'priority_reason': reason,
                    'priority_keyword': keyword,
                }

    return {
        'is_high_priority': False,
        'priority_reason': '',
        'priority_keyword': '',
    }


def append_submission_review_event(submission: DataSubmission, *, actor=None, action_key, title, summary, details=None, mark_reviewed=True):
    history = list(submission.review_history or [])
    actor_name = ''
    actor_email = ''
    actor_id = None
    if actor is not None and getattr(actor, 'is_authenticated', False):
        actor_name = actor.name or actor.username or actor.email
        actor_email = actor.email or ''
        actor_id = actor.pk

    history.append(
        {
            'action_key': str(action_key or '').strip() or 'updated',
            'title': str(title or '').strip() or 'Submission updated',
            'summary': str(summary or '').strip() or 'No summary was recorded for this action.',
            'details': details or {},
            'changed_at': timezone.now().isoformat(),
            'changed_by_id': actor_id,
            'changed_by_name': actor_name,
            'changed_by_email': actor_email,
        }
    )
    submission.review_history = history[-50:]

    if mark_reviewed and actor_id is not None:
        submission.last_reviewed_by = actor
        submission.last_reviewed_at = timezone.now()

    return submission.review_history


def build_admin_submission_alert_title(submission: DataSubmission):
    priority_metadata = build_submission_priority_metadata(submission)
    if priority_metadata['is_high_priority']:
        return 'High-priority file uploaded'
    return 'New submission received'


def build_admin_submission_alert_message(submission: DataSubmission):
    priority_metadata = build_submission_priority_metadata(submission)
    version_label = f'v{submission.version_number}'
    sender_label = submission.submitted_by.name or submission.submitted_by.email or submission.submitted_by.username or 'Unknown user'
    sheet_label = f' on sheet "{submission.sheet_name}"' if submission.sheet_name else ''
    message = f'File "{submission.original_filename}" {version_label}{sheet_label} was received from {sender_label}.'
    if priority_metadata['is_high_priority'] and priority_metadata['priority_reason']:
        message += f' {priority_metadata["priority_reason"]}'
    return message


def send_admin_submission_alert_email(recipient: User, submission: DataSubmission, title: str, message: str):
    if not recipient or not recipient.email:
        return

    app_url = getattr(settings, 'APP_URL', 'http://localhost:8000').rstrip('/')
    sender = submission.submitted_by
    sender_label = sender.name or sender.email or sender.username or 'Unknown user'
    sheet_label = submission.sheet_name or 'Unknown sheet'
    email_lines = [
        f'Hello {recipient.name or recipient.username},',
        '',
        title,
        message,
        '',
        f'Submitted by: {sender_label}',
        f'Sender email: {sender.email or "No email"}',
        f'File: {submission.original_filename}',
        f'Sheet: {sheet_label}',
        f'Status: {submission.status}',
        f'Open CITOSIS PRO: {app_url}/',
    ]

    send_mail(
        f'CITOSIS PRO admin notification: {title}',
        '\n'.join(email_lines),
        settings.DEFAULT_FROM_EMAIL,
        [recipient.email],
        fail_silently=True,
    )


def create_admin_submission_alerts(submission: DataSubmission, actor=None):
    recipients = [
        user
        for user in User.objects.filter(
            status=UserStatusChoices.ACTIVE,
            deleted_at__isnull=True,
        ).exclude(pk=submission.submitted_by_id)
        if can_access_admin_dashboard(user)
    ]
    if not recipients:
        return []

    title = build_admin_submission_alert_title(submission)
    message = build_admin_submission_alert_message(submission)
    created_by = actor if getattr(actor, 'is_authenticated', False) else None
    notifications = [
        SubmissionNotification(
            recipient=recipient,
            submission=submission,
            notification_type=SubmissionNotification.TYPE_SUBMISSION,
            title=title,
            message=message,
            status_snapshot=submission.status,
            created_by=created_by,
        )
        for recipient in recipients
    ]
    created_notifications = SubmissionNotification.objects.bulk_create(notifications)
    for notification in created_notifications:
        send_admin_submission_alert_email(notification.recipient, submission, title, message)
    return created_notifications


def soft_delete_to_recycle(instance: models.Model, item_type: str, deleted_by, request=None):
    if getattr(instance, 'deleted_at', None):
        return instance

    snapshot = serialize_instance(instance)
    RecycleBin.objects.create(
        item_type=item_type,
        item_id=str(instance.pk),
        item_data=snapshot,
        deleted_by=deleted_by,
    )
    instance.deleted_at = timezone.now()
    if isinstance(instance, User):
        instance.status = UserStatusChoices.INACTIVE
        instance.is_active = False
        tombstone_user_identity(instance)
    instance.save()
    log_action(deleted_by, f'Deleted {item_type}', f'Soft deleted {item_type} #{instance.pk}.', request)
    return instance


def get_model_for_item_type(item_type: str):
    mapping = {
        RecycleItemTypeChoices.RECORD: TourismRecord,
        RecycleItemTypeChoices.VISITOR: Visitor,
        RecycleItemTypeChoices.USER: User,
    }
    return mapping[item_type]


def restore_recycle_entry(entry: RecycleBin, restored_by, request=None):
    model = get_model_for_item_type(entry.item_type)
    instance = model.all_objects.filter(pk=entry.item_id).first()
    if instance:
        instance.deleted_at = None
        if isinstance(instance, User):
            instance.status = UserStatusChoices.ACTIVE
            instance.is_active = True
        instance.save()
    entry.restored_at = timezone.now()
    entry.restored_by = restored_by
    entry.save(update_fields=['restored_at', 'restored_by'])
    log_action(restored_by, f'Restored {entry.item_type}', f'Restored {entry.item_type} #{entry.item_id}.', request)
    return entry


def purge_recycle_entry(entry: RecycleBin, purged_by, request=None):
    model = get_model_for_item_type(entry.item_type)
    instance = model.all_objects.filter(pk=entry.item_id).first()
    if instance and getattr(instance, 'deleted_at', None):
        instance.delete()
    item_id = entry.item_id
    item_type = entry.item_type
    entry.delete()
    log_action(purged_by, f'Purged {item_type}', f'Permanently removed {item_type} #{item_id}.', request)


def coerce_value(field: Field, value: Any):
    if value in ['', None]:
        return None
    if isinstance(field, DateTimeField) and isinstance(value, str):
        parsed = parse_datetime(value)
        if parsed is None:
            return value
        if timezone.is_naive(parsed):
            return timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed
    return value


def build_import_defaults(model, row: dict[str, Any]):
    defaults = {}
    for field in model._meta.fields:
        if field.primary_key:
            continue
        key = field.attname
        if key in row:
            defaults[key] = coerce_value(field, row.get(key))
    return defaults


def serialize_backup_payload():
    return {
        'users': [serialize_instance(item) for item in User.all_objects.order_by('id')],
        'records': [serialize_instance(item) for item in TourismRecord.all_objects.order_by('id')],
        'visitors': [serialize_instance(item) for item in Visitor.all_objects.order_by('id')],
        'activity_logs': [serialize_instance(item) for item in ActivityLog.objects.order_by('id')],
        'recycle_bin': [serialize_instance(item) for item in RecycleBin.objects.order_by('id')],
        'exported_at': timezone.now().isoformat(),
    }


def import_backup_payload(payload: dict[str, Any], actor=None, request=None):
    users = payload.get('users', [])
    records = payload.get('records', [])
    visitors = payload.get('visitors', [])
    logs = payload.get('activity_logs', [])
    recycle_entries = payload.get('recycle_bin', [])

    for row in users:
        user_id = row.get('id')
        if not user_id:
            continue
        defaults = build_import_defaults(User, row)
        User.all_objects.update_or_create(id=user_id, defaults=defaults)

    for row in records:
        row_id = row.get('id')
        if not row_id:
            continue
        defaults = build_import_defaults(TourismRecord, row)
        TourismRecord.all_objects.update_or_create(id=row_id, defaults=defaults)

    for row in visitors:
        row_id = row.get('id')
        if not row_id:
            continue
        defaults = build_import_defaults(Visitor, row)
        Visitor.all_objects.update_or_create(id=row_id, defaults=defaults)

    for row in logs:
        row_id = row.get('id')
        if not row_id:
            continue
        defaults = build_import_defaults(ActivityLog, row)
        ActivityLog.objects.update_or_create(id=row_id, defaults=defaults)

    for row in recycle_entries:
        row_id = row.get('id')
        if not row_id:
            continue
        defaults = build_import_defaults(RecycleBin, row)
        RecycleBin.objects.update_or_create(id=row_id, defaults=defaults)

    if actor:
        log_action(actor, 'Imported backup', 'Imported backup payload into the system.', request)

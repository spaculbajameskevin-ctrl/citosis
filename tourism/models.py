from django.conf import settings
from django.db import models

from citosis_pro.common import RecordCategoryChoices, TimestampedSoftDeleteModel, VisitorStatusChoices


class TourismRecord(TimestampedSoftDeleteModel):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=RecordCategoryChoices.choices, default=RecordCategoryChoices.OTHER)
    description = models.TextField(blank=True, null=True)
    image_path = models.ImageField(upload_to='tourism_records/', blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_records',
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='updated_records',
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'tourism_records'
        ordering = ['-updated_at', '-created_at']

    def __str__(self):
        return self.name


class Visitor(TimestampedSoftDeleteModel):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    place = models.CharField(max_length=255)
    origin = models.CharField(max_length=255)
    visit_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=VisitorStatusChoices.choices, default=VisitorStatusChoices.CHECKED_IN)
    tourism_record = models.ForeignKey(TourismRecord, on_delete=models.SET_NULL, blank=True, null=True, related_name='visitors')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_visitors',
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='updated_visitors',
        blank=True,
        null=True,
    )

    class Meta:
        db_table = 'visitors'
        ordering = ['-visit_date', '-created_at']

    def __str__(self):
        return self.name

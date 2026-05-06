from django.contrib import admin

from tourism.models import TourismRecord, Visitor


@admin.register(TourismRecord)
class TourismRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'location', 'category', 'created_by', 'updated_by', 'deleted_at')
    search_fields = ('name', 'location', 'category', 'description')
    list_filter = ('category', 'deleted_at')


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'place', 'origin', 'visit_date', 'status', 'tourism_record', 'deleted_at')
    search_fields = ('name', 'place', 'origin')
    list_filter = ('status', 'visit_date', 'deleted_at')
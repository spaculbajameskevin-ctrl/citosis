from rest_framework import serializers

from tourism.models import TourismRecord, Visitor


class TourismRecordSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TourismRecord
        fields = [
            'id',
            'name',
            'location',
            'category',
            'description',
            'image_path',
            'image_url',
            'created_by',
            'updated_by',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'updated_by', 'created_at', 'updated_at']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image_path and hasattr(obj.image_path, 'url'):
            return request.build_absolute_uri(obj.image_path.url) if request else obj.image_path.url
        return None

    def get_created_by_name(self, obj):
        return obj.created_by.name if obj.created_by else ''

    def get_updated_by_name(self, obj):
        return obj.updated_by.name if obj.updated_by else ''


class VisitorSerializer(serializers.ModelSerializer):
    tourism_record_name = serializers.CharField(source='tourism_record.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Visitor
        fields = [
            'id',
            'name',
            'place',
            'origin',
            'visit_date',
            'status',
            'tourism_record',
            'tourism_record_name',
            'created_by',
            'updated_by',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'updated_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return obj.created_by.name if obj.created_by else ''

    def get_updated_by_name(self, obj):
        return obj.updated_by.name if obj.updated_by else ''

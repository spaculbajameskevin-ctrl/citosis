from django.urls import include, path
from rest_framework.routers import DefaultRouter

from tourism.views import TourismAttractionRecordExportView, TourismRecordViewSet, VisitorViewSet

router = DefaultRouter()
router.register(r'records', TourismRecordViewSet, basename='records')
router.register(r'visitors', VisitorViewSet, basename='visitors')

urlpatterns = [
    path('visitors/export/excel/', TourismAttractionRecordExportView.as_view(), name='visitors-export-excel'),
    path('', include(router.urls)),
]

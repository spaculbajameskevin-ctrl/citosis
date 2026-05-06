from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.templatetags.static import static as static_path
from django.urls import include, path
from django.views.generic import RedirectView

from citosis_pro.views import index
from accounts.views import PasswordResetConfirmView, SetPasswordView, VerifyEmailView

urlpatterns = [
    path('favicon.ico', RedirectView.as_view(url=static_path('favicon.ico'), permanent=False), name='favicon'),
    path('set-password/<uidb64>/<token>/', SetPasswordView.as_view(), name='set-password'),
    path('verify-email/<str:token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('reset-password/<str:token>/', PasswordResetConfirmView.as_view(), name='reset-password'),
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('tourism.urls')),
    path('api/', include('audit.urls')),
    path('', index, name='home'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RegistrationView,
    ResendTwoFactorView,
    ResendVerificationView,
    UserViewSet,
    VerifyTwoFactorView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/verify-2fa/', VerifyTwoFactorView.as_view(), name='auth-verify-2fa'),
    path('auth/resend-2fa/', ResendTwoFactorView.as_view(), name='auth-resend-2fa'),
    path('auth/register/', RegistrationView.as_view(), name='auth-register'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='auth-resend-verification'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]

from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from accounts.models import User


class EmailOrUsernameModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        login_value = username or kwargs.get('email') or kwargs.get(User.USERNAME_FIELD)
        if not login_value or not password:
            return None

        user = User.all_objects.filter(
            Q(email__iexact=login_value) | Q(username__iexact=login_value),
            deleted_at__isnull=True,
        ).first()
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
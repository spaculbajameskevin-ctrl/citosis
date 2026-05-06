from rest_framework import serializers

from accounts.establishments import ESTABLISHMENT_OPTION_SET
from accounts.emails import send_account_setup_email, send_email_verification_email
from accounts.identity import tombstone_deleted_users_with_email
from accounts.models import User
from accounts.security import issue_email_verification_challenge
from citosis_pro.common import RoleChoices, UserStatusChoices


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    email_verified = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'name',
            'email',
            'office',
            'role',
            'status',
            'last_login',
            'email_verified_at',
            'email_verified',
            'locked_until',
            'profile_picture',
            'profile_picture_url',
            'password',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'last_login', 'email_verified_at', 'email_verified', 'locked_until', 'profile_picture_url', 'created_at', 'updated_at']

    def get_email_verified(self, obj):
        return bool(obj.email_verified_at)

    def get_profile_picture_url(self, obj):
        if not obj.profile_picture:
            return None
        request = self.context.get('request')
        url = obj.profile_picture.url
        return request.build_absolute_uri(url) if request else url

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value).lower()
        queryset = User.all_objects.filter(email__iexact=normalized, deleted_at__isnull=True)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        tombstone_deleted_users_with_email(user.email)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        try:
            if password:
                challenge = issue_email_verification_challenge(user)
                send_email_verification_email(user, challenge)
            else:
                send_account_setup_email(user)
        except Exception:
            # Avoid blocking user creation if email fails.
            pass
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        email_changed = False
        for attr, value in validated_data.items():
            if attr == 'email' and getattr(instance, attr) != value:
                email_changed = True
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        if email_changed:
            instance.email_verified_at = None
            tombstone_deleted_users_with_email(instance.email)
        instance.save()
        if email_changed:
            try:
                challenge = issue_email_verification_challenge(instance)
                send_email_verification_email(instance, challenge)
            except Exception:
                pass
        return instance


class ProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'email', 'office', 'role', 'profile_picture', 'profile_picture_url']
        read_only_fields = ['id', 'email', 'role', 'profile_picture_url']

    def get_profile_picture_url(self, obj):
        if not obj.profile_picture:
            return None
        request = self.context.get('request')
        url = obj.profile_picture.url
        return request.build_absolute_uri(url) if request else url


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    remember = serializers.BooleanField(required=False, default=True)


class TwoFactorSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.CharField(min_length=6, max_length=6)
    remember = serializers.BooleanField(required=False, default=True)

    def validate_code(self, value):
        normalized = str(value or '').strip()
        if not normalized.isdigit():
            raise serializers.ValidationError('Enter the 6-digit verification code.')
        return normalized


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RegistrationSerializer(serializers.ModelSerializer):
    office = serializers.CharField(trim_whitespace=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['name', 'email', 'office', 'password', 'password_confirm']

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value).lower()
        if User.all_objects.filter(email__iexact=normalized, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return normalized

    def validate_office(self, value):
        normalized = value.strip()
        if normalized not in ESTABLISHMENT_OPTION_SET:
            raise serializers.ValidationError('Select a valid establishment from the list.')
        return normalized

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        password = validated_data.pop('password')
        base_name = validated_data['name'].strip()
        email = validated_data['email']
        tombstone_deleted_users_with_email(email)
        username = self._build_unique_username(base_name, email)
        user = User(
            username=username,
            role=RoleChoices.USER,
            status=UserStatusChoices.PENDING_APPROVAL,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user

    def _build_unique_username(self, name, email):
        base = ''.join(char.lower() for char in name if char.isalnum())[:20] or email.split('@', 1)[0].lower()
        username = base
        counter = 1
        while User.all_objects.filter(username__iexact=username).exists():
            username = f'{base[:16]}{counter}'
            counter += 1
        return username

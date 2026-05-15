import re
from unittest.mock import patch
import json

from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.establishments import ESTABLISHMENT_OPTIONS
from accounts.models import AuthChallenge, Establishment, User
from accounts.security import issue_email_verification_challenge
from audit.models import SubmissionNotification
from citosis_pro.common import RoleChoices, UserStatusChoices


def extract_reset_token(body):
    match = re.search(r'/reset-password/([^/\s]+)/', body)
    return match.group(1) if match else ''


def extract_verification_token(body):
    match = re.search(r'/verify-email/([^/\s]+)/', body)
    return match.group(1) if match else ''


def extract_six_digit_code(body):
    match = re.search(r'(\d{6})', body)
    return match.group(1) if match else ''


class DummyUrlOpenResponse:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps({'id': 'email_123'}).encode('utf-8')


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RegistrationApiTests(APITestCase):
    def test_registration_creates_pending_user_sends_verification_email_and_notifies_admin_in_app(self):
        super_admin = User.objects.create_user(
            email='admin-notify@example.com',
            password='strongpass123',
            username='adminnotify',
            name='Admin Notify',
            office=ESTABLISHMENT_OPTIONS[0],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Sample User',
                'email': 'sample@example.com',
                'office': ESTABLISHMENT_OPTIONS[0],
                'password': 'strongpass123',
                'password_confirm': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        created_user = User.objects.get(email='sample@example.com')
        self.assertEqual(created_user.role, RoleChoices.USER)
        self.assertEqual(created_user.status, UserStatusChoices.PENDING_APPROVAL)
        self.assertFalse(created_user.is_active)
        self.assertIsNone(created_user.email_verified_at)
        self.assertEqual(created_user.office, ESTABLISHMENT_OPTIONS[0])
        self.assertTrue(created_user.check_password('strongpass123'))
        self.assertTrue(response.data['verification_email_sent'])
        notification = SubmissionNotification.objects.get(
            recipient=super_admin,
            notification_type=SubmissionNotification.TYPE_USER_REGISTRATION,
        )
        self.assertEqual(notification.title, 'New user registration')
        self.assertEqual(notification.status_snapshot, UserStatusChoices.PENDING_APPROVAL)
        self.assertEqual(notification.metadata['user_email'], 'sample@example.com')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Verify your CITOSIS PRO email', mail.outbox[0].subject)
        self.assertTrue(extract_verification_token(mail.outbox[0].body))

    def test_registration_rejects_password_mismatch(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Mismatch User',
                'email': 'mismatch@example.com',
                'office': ESTABLISHMENT_OPTIONS[1],
                'password': 'strongpass123',
                'password_confirm': 'differentpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='mismatch@example.com').exists())

    def test_registration_rejects_unknown_establishment(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Unknown Establishment User',
                'email': 'unknown-establishment@example.com',
                'office': 'Unknown Establishment',
                'password': 'strongpass123',
                'password_confirm': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('office', response.data)
        self.assertFalse(User.objects.filter(email='unknown-establishment@example.com').exists())

    def test_registration_accepts_added_establishment(self):
        Establishment.objects.create(name='Newly Added Lodge')

        response = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Added Establishment User',
                'email': 'added-establishment@example.com',
                'office': 'Newly Added Lodge',
                'password': 'strongpass123',
                'password_confirm': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(email='added-establishment@example.com', office='Newly Added Lodge').exists())

    def test_registration_allows_email_from_deleted_user(self):
        deleted_user = User.objects.create_user(
            email='reuse@example.com',
            password='oldstrongpass123',
            username='oldreuse',
            name='Old Reuse',
            office=ESTABLISHMENT_OPTIONS[0],
            status=UserStatusChoices.INACTIVE,
            deleted_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/register/',
            {
                'name': 'New Reuse',
                'email': 'reuse@example.com',
                'office': ESTABLISHMENT_OPTIONS[1],
                'password': 'strongpass123',
                'password_confirm': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        deleted_user.refresh_from_db()
        self.assertNotEqual(deleted_user.email, 'reuse@example.com')
        self.assertTrue(deleted_user.email.endswith('@deleted.citosis.local'))
        self.assertTrue(User.objects.filter(email='reuse@example.com').exists())

    def test_pending_user_cannot_log_in_until_approved(self):
        pending_user = User.objects.create_user(
            email='pending@example.com',
            password='strongpass123',
            username='pendinguser',
            name='Pending User',
            office=ESTABLISHMENT_OPTIONS[2],
            status=UserStatusChoices.PENDING_APPROVAL,
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': pending_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['detail'], 'Your account is still pending admin approval.')

    def test_approved_user_must_verify_email_before_login(self):
        user = User.objects.create_user(
            email='approvefirst@example.com',
            password='strongpass123',
            username='approvefirst',
            name='Approve First',
            office=ESTABLISHMENT_OPTIONS[3],
            status=UserStatusChoices.ACTIVE,
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn('not verified yet', response.data['detail'])

    def test_verification_link_marks_email_verified(self):
        user = User.objects.create_user(
            email='verifyme@example.com',
            password='strongpass123',
            username='verifyme',
            name='Verify Me',
            office=ESTABLISHMENT_OPTIONS[4],
            status=UserStatusChoices.ACTIVE,
        )
        challenge = issue_email_verification_challenge(user)

        response = self.client.get(f'/verify-email/{challenge.token}/')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        challenge.refresh_from_db()
        self.assertIsNotNone(user.email_verified_at)
        self.assertIsNotNone(challenge.used_at)

    def test_login_updates_last_login_timestamp(self):
        active_user = User.objects.create_user(
            email='active@example.com',
            password='strongpass123',
            username='activeuser',
            name='Active User',
            office=ESTABLISHMENT_OPTIONS[5],
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': active_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        active_user.refresh_from_db()
        self.assertIsNotNone(active_user.last_login)

    def test_forgot_password_flow_sends_reset_link_and_marks_email_verified(self):
        user = User.objects.create_user(
            email='resetme@example.com',
            password='oldstrongpass123',
            username='resetme',
            name='Reset Me',
            office=ESTABLISHMENT_OPTIONS[6],
            status=UserStatusChoices.ACTIVE,
        )

        request_response = self.client.post(
            '/api/auth/forgot-password/',
            {'email': user.email},
            format='json',
        )

        self.assertEqual(request_response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        token = extract_reset_token(mail.outbox[0].body)
        self.assertTrue(token)

        reset_response = self.client.post(
            f'/reset-password/{token}/',
            {
                'password1': 'newstrongpass123',
                'password2': 'newstrongpass123',
            },
        )

        self.assertEqual(reset_response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password('newstrongpass123'))
        self.assertIsNotNone(user.email_verified_at)

    def test_failed_logins_lock_account_temporarily(self):
        user = User.objects.create_user(
            email='locked@example.com',
            password='strongpass123',
            username='lockeduser',
            name='Locked User',
            office=ESTABLISHMENT_OPTIONS[7],
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        for _ in range(4):
            response = self.client.post(
                '/api/auth/login/',
                {'username': user.email, 'password': 'wrongpass123'},
                format='json',
            )
            self.assertEqual(response.status_code, 400)

        final_response = self.client.post(
            '/api/auth/login/',
            {'username': user.email, 'password': 'wrongpass123'},
            format='json',
        )
        self.assertEqual(final_response.status_code, 423)

        locked_response = self.client.post(
            '/api/auth/login/',
            {'username': user.email, 'password': 'strongpass123'},
            format='json',
        )
        self.assertEqual(locked_response.status_code, 423)

    @override_settings(DEBUG=False, SKIP_SUPER_ADMIN_2FA=False, REQUIRE_SUPER_ADMIN_2FA=True)
    def test_super_admin_login_requires_two_factor_and_accepts_code(self):
        admin_user = User.objects.create_user(
            email='superadmin@example.com',
            password='strongpass123',
            username='superadmin',
            name='Super Admin',
            office=ESTABLISHMENT_OPTIONS[8],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        login_response = self.client.post(
            '/api/auth/login/',
            {
                'username': admin_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.data['requires_two_factor'])
        self.assertEqual(len(mail.outbox), 1)
        code = extract_six_digit_code(mail.outbox[0].body)
        self.assertTrue(code)

        verify_response = self.client.post(
            '/api/auth/verify-2fa/',
            {
                'challenge_id': login_response.data['challenge_id'],
                'code': code,
            },
            format='json',
        )

        self.assertEqual(verify_response.status_code, 200)
        self.assertIn('token', verify_response.data)

    @override_settings(DEBUG=True, SKIP_SUPER_ADMIN_2FA=True, EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    def test_super_admin_login_can_skip_two_factor_in_debug(self):
        admin_user = User.objects.create_user(
            email='localsuperadmin@example.com',
            password='strongpass123',
            username='localsuperadmin',
            name='Local Super Admin',
            office=ESTABLISHMENT_OPTIONS[8],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': admin_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertNotIn('requires_two_factor', response.data)

    @override_settings(
        DEBUG=False,
        SKIP_SUPER_ADMIN_2FA=False,
        REQUIRE_SUPER_ADMIN_2FA=True,
        EMAIL_DELIVERY_METHOD='resend',
        RESEND_API_KEY='re_test_key',
        DEFAULT_FROM_EMAIL='CITOSIS PRO <no-reply@example.com>',
    )
    @patch('accounts.emails.request.urlopen', return_value=DummyUrlOpenResponse())
    def test_super_admin_login_uses_resend_api_for_two_factor(self, mocked_urlopen):
        admin_user = User.objects.create_user(
            email='resendadmin@example.com',
            password='strongpass123',
            username='resendadmin',
            name='Resend Admin',
            office=ESTABLISHMENT_OPTIONS[8],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': admin_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['requires_two_factor'])
        self.assertEqual(mocked_urlopen.call_count, 1)

    @override_settings(DEBUG=False, REQUIRE_SUPER_ADMIN_2FA=False, EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend')
    def test_super_admin_login_can_skip_two_factor_when_disabled_by_setting(self):
        admin_user = User.objects.create_user(
            email='renderadmin@example.com',
            password='strongpass123',
            username='renderadmin',
            name='Render Admin',
            office=ESTABLISHMENT_OPTIONS[8],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': admin_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)
        self.assertNotIn('requires_two_factor', response.data)

    @override_settings(DEBUG=False, SKIP_SUPER_ADMIN_2FA=False, REQUIRE_SUPER_ADMIN_2FA=True)
    @patch('accounts.views.issue_super_admin_two_factor_challenge', side_effect=RuntimeError('2FA storage unavailable'))
    def test_super_admin_login_returns_503_when_two_factor_setup_fails(self, mocked_issue):
        admin_user = User.objects.create_user(
            email='broken2fa@example.com',
            password='strongpass123',
            username='broken2fa',
            name='Broken 2FA',
            office=ESTABLISHMENT_OPTIONS[8],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            '/api/auth/login/',
            {
                'username': admin_user.email,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 503)
        self.assertIn('Super Admin verification', response.data['detail'])


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class UserStatusActionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='strongpass123',
            username='adminuser',
            name='Admin User',
            office=ESTABLISHMENT_OPTIONS[9],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )
        self.pending_user = User.objects.create_user(
            email='reviewme@example.com',
            password='strongpass123',
            username='reviewme',
            name='Review Me',
            office=ESTABLISHMENT_OPTIONS[10],
            status=UserStatusChoices.PENDING_APPROVAL,
        )
        self.client.force_authenticate(user=self.admin)

    def test_super_admin_can_approve_pending_user(self):
        response = self.client.post(
            f'/api/users/{self.pending_user.pk}/set-status/',
            {'status': UserStatusChoices.ACTIVE},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.pending_user.refresh_from_db()
        self.assertEqual(self.pending_user.status, UserStatusChoices.ACTIVE)
        self.assertTrue(self.pending_user.is_active)

    def test_super_admin_can_deactivate_user(self):
        active_user = User.objects.create_user(
            email='managed@example.com',
            password='strongpass123',
            username='manageduser',
            name='Managed User',
            office=ESTABLISHMENT_OPTIONS[11],
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

        response = self.client.post(
            f'/api/users/{active_user.pk}/set-status/',
            {'status': UserStatusChoices.INACTIVE},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        active_user.refresh_from_db()
        self.assertEqual(active_user.status, UserStatusChoices.INACTIVE)
        self.assertFalse(active_user.is_active)

    def test_super_admin_can_create_user_with_deleted_user_email(self):
        deleted_user = User.objects.create_user(
            email='admin-reuse@example.com',
            password='oldstrongpass123',
            username='oldadminreuse',
            name='Old Admin Reuse',
            office=ESTABLISHMENT_OPTIONS[0],
            status=UserStatusChoices.INACTIVE,
            deleted_at=timezone.now(),
        )

        response = self.client.post(
            '/api/users/',
            {
                'username': 'newadminreuse',
                'name': 'New Admin Reuse',
                'email': 'admin-reuse@example.com',
                'office': ESTABLISHMENT_OPTIONS[1],
                'role': RoleChoices.USER,
                'status': UserStatusChoices.ACTIVE,
                'password': 'strongpass123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        deleted_user.refresh_from_db()
        self.assertNotEqual(deleted_user.email, 'admin-reuse@example.com')
        self.assertTrue(deleted_user.email.endswith('@deleted.citosis.local'))
        self.assertTrue(User.objects.filter(email='admin-reuse@example.com').exists())


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class EstablishmentApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='establishment-admin@example.com',
            password='strongpass123',
            username='establishmentadmin',
            name='Establishment Admin',
            office=ESTABLISHMENT_OPTIONS[0],
            role=RoleChoices.SUPER_ADMIN,
            status=UserStatusChoices.ACTIVE,
            email_verified_at=timezone.now(),
        )

    def test_anyone_can_list_establishments(self):
        Establishment.objects.create(name='Public List Resort')

        response = self.client.get('/api/establishments/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('Public List Resort', {item['name'] for item in response.data})

    def test_super_admin_can_add_establishment(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            '/api/establishments/',
            {'name': 'New Tourism Inn'},
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Establishment.objects.filter(name='New Tourism Inn').exists())

    def test_duplicate_establishment_is_rejected_case_insensitively(self):
        Establishment.objects.create(name='Duplicate Resort')
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            '/api/establishments/',
            {'name': 'duplicate resort'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('name', response.data)

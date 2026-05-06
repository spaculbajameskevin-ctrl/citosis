# Email Verification Enforcement

## Overview
Email verification is now **required** and **enforced** across all API endpoints. Users must verify their email address before they can access any protected resources.

## What Changed

### 1. Enhanced Permission Classes
All permission classes in `accounts/permissions.py` have been updated to include email verification checks:

- ✅ `IsActiveSystemUser` - Requires `email_verified_at is not None`
- ✅ `IsAdminDashboardUser` - Requires `email_verified_at is not None`
- ✅ `CanEditDataPermission` - Requires `email_verified_at is not None`
- ✅ `CanApproveSubmissionPermission` - Requires `email_verified_at is not None`
- ✅ `CanDeleteDataPermission` - Requires `email_verified_at is not None`
- ✅ `IsSuperAdminOnly` - Requires `email_verified_at is not None`
- ✅ `IsSubmissionWorkspaceAdmin` - Requires `email_verified_at is not None`

### 2. What This Means

| Scenario | Before | After |
|----------|--------|-------|
| User registered but email not verified | Could access some APIs if approved | **Blocked - Must verify email** |
| User approved but email not verified | Could access admin panel | **Blocked - Must verify email** |
| User tries to edit data without email verification | Could succeed if role allows | **Blocked - Must verify email** |
| User verified email | Can access all APIs | ✅ Can access all APIs |

## User Flow

### Registration Flow
1. User registers with email
2. Verification email is sent automatically
3. User clicks verification link in email
4. User's `email_verified_at` field is set
5. User can now login

### Login Flow
1. User submits username/email + password
2. System validates credentials
3. If Super Admin: 2FA code sent (or skipped in dev mode)
4. User submits 2FA code (if required)
5. User receives auth token ✅

### API Access
1. User includes auth token in request
2. Permission classes check:
   - Is user authenticated? ✅
   - Is user active/not deleted? ✅
   - Is email verified? ✅ **← New requirement**
   - Does user have required role? ✅
3. Request proceeds or is rejected

## Error Handling

If an unauthenticated user tries to access a protected endpoint:
```json
{
  "detail": "Authentication credentials were not provided."
}
```

If an authenticated user with unverified email tries to access:
```json
{
  "detail": "You do not have permission to perform this action."
}
```

## Frontend Considerations

### For API Clients
- After login, users with unverified emails will receive `403 Forbidden` on protected endpoints
- Display a message: "Please verify your email before accessing this feature"
- Provide option to resend verification email via `/api/resend-verification/` endpoint

### Email Verification Endpoint
Users can resend verification email:
```
POST /api/resend-verification/
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "detail": "If an account exists for that email, a verification email has been sent."
}
```

## Testing

### Test Case 1: Unverified User Cannot Access API
```bash
# Register user
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "name": "Test User",
    "password": "SecurePass123!"
  }'

# Try to access user profile (will fail)
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Token YOUR_TOKEN"

# Response: 403 Forbidden
```

### Test Case 2: Verified User Can Access API
```bash
# Click verification link in email or verify manually in admin

# Now access user profile (will succeed)
curl -X GET http://localhost:8000/api/me/ \
  -H "Authorization: Token YOUR_TOKEN"

# Response: 200 OK with user data
```

## Database Impact
No schema changes needed! The existing `email_verified_at` field is used:
- When `email_verified_at` is `NULL`: Email not verified
- When `email_verified_at` is a timestamp: Email is verified

## Rollback (if needed)
To revert to the old behavior, remove the email verification check from each permission class:
```python
# Remove this line from each permission class:
and user.email_verified_at is not None
```

## Files Modified
- ✅ `accounts/permissions.py` - Added email verification checks to all permission classes

## Security Benefits
✅ Ensures all active users have verified emails
✅ Prevents unauthorized email usage
✅ Improves audit trail (email verification timestamp)
✅ Reduces spam/fake account access

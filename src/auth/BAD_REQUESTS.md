# BadRequestException - Auth Module

## POST /auth/login
- (Unauthorized) User or password invalid
- (Unauthorized) Email not verified

## POST /auth/refresh
- (Unauthorized) Invalid or expired refresh token
- Email not verified

## POST /auth/forgot-password
- User with this email does not exist

## POST /auth/verify-code
- User with this email does not exist
- No reset code found or code has expired
- Invalid reset code
- Reset code has expired

## POST /auth/reset-password
- Passwords do not match
- User with this email does not exist
- No reset code found or code has expired
- Invalid reset code
- Reset code has expired
- User not found after password reset

## POST /auth/verify-email
- User with this email does not exist
- Email is already verified
- No confirmation code found
- Invalid confirmation code
- Confirmation code has expired

## POST /auth/resend-email-confirmation
- User with this email does not exist
- Email is already verified

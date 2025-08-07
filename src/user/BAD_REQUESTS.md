# BadRequestException - User Module

## GET /user
- Failed to fetch users

## GET /user/:id
- User not found
- Failed to fetch user

## POST /user
- Failed to create user
- User with this email already exists
- User with this document already exists
- Field '{key}' cannot be empty

### Validation Errors (POST /user)
- Name is required
- Email must be a valid email address
- Email is required
- Phone is required
- Password must be at least 8 characters long
- Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)
- Password is required
- Document type must be cpf or cnpj
- Document value is required
- Role must be MASTER_ADMIN, ADMIN or USER
- Store ID is required

### Success Response (POST /user)
- Returns user object without additional message (compatible with frontend)

## PATCH /user/:id
- Failed to update user
- Field '{key}' cannot be empty

## DELETE /user/:id
- Failed to remove user

## POST /user/cleanup-unverified
- (No specific BadRequestException - returns success message)

## Validation Interceptor
- Invalid data (when validation errors occur)
- Returns structured error response with field and message for each validation error

# BadRequestException - User Module

## GET /user
- Failed to fetch users

## GET /user/:id
- User not found
- Failed to fetch user

## POST /user
- Failed to create user
- Field '{key}' cannot be empty

## PATCH /user/:id
- Failed to update user
- Field '{key}' cannot be empty

## DELETE /user/:id
- Failed to remove user

## POST /user/cleanup-unverified
- (No specific BadRequestException - returns success message)

# BadRequestException - User Module

## GET /user
- Failed to fetch users

## GET /user/:id
- User not found
- Failed to fetch user

## POST /user
- Failed to create user
- Field '{key}' cannot be empty
- Field '{field}' is required and cannot be empty (validação util)

## PATCH /user/:id
- Failed to update user
- Field '{key}' cannot be empty
- Field '{field}' is required and cannot be empty (validação util)

## DELETE /user/:id
- Failed to remove user

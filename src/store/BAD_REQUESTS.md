# BadRequestException - Store Module

## GET /store
- Failed to fetch stores

## GET /store/:id
- Store not found
- Failed to fetch store

## POST /store
- Passwords do not match
- Failed to create store
- Field '{field}' is required and cannot be empty (validação util)

## PATCH /store/:id
- Failed to update store
- Field '{key}' cannot be empty

## DELETE /store/:id
- Failed to remove store

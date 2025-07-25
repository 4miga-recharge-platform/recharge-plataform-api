# BadRequestException - Order Module

## GET /orders
- {error.message} (Prisma errors)
- (Forbidden) User does not belong to this store

## GET /orders/:id
- {error.message} (Prisma errors)
- (NotFound) Order not found

## POST /orders
- (NotFound) Package not found
- (BadRequest) Package does not belong to this store
- (NotFound) Payment method not available for this package
- Unique constraint violation
- Foreign key constraint violation
- {error.message} (Prisma errors)

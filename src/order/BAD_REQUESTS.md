# BadRequestException - Order Module

## GET /orders
- {error.message} (erros do Prisma)
- (Forbidden) User does not belong to this store

## GET /orders/:id
- {error.message} (erros do Prisma)
- (NotFound) Order not found

## POST /orders
- (NotFound) Package not found
- (BadRequest) Package does not belong to this store
- (NotFound) Payment method not available for this package
- Unique constraint violation
- Foreign key constraint violation
- {error.message} (erros do Prisma)

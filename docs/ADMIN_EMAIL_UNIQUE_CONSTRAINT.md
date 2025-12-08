# Admin Email Unique Constraint

## Overview

This document describes the unique partial index constraint that ensures an email can only be a **RESELLER_ADMIN** in one store. **MASTER_ADMIN** is excluded from this constraint to allow access to all stores.

## Problem

In a multi-store system, the same email can be registered as a regular user (`USER` role) in multiple stores. However, we need to ensure that an email can only be a **RESELLER_ADMIN** (`RESELLER_ADMIN_4MIGA_USER`) in one store. **MASTER_ADMIN** (`MASTER_ADMIN_4MIGA_USER`) is excluded as it needs access to all stores.

This constraint is necessary for:
- **Admin Login**: The `auth/admin/login` endpoint needs to identify which store a RESELLER_ADMIN belongs to without requiring `storeId` in the request
- **Data Integrity**: Prevents conflicts when promoting users to RESELLER_ADMIN role

## Solution

A **unique partial index** is created in PostgreSQL that applies uniqueness only when the user role is ADMIN.

### Database Constraint

**Initial Migration**: `prisma/migrations/20251208115512_add_unique_email_admin_constraint/migration.sql`
**Update Migration**: `prisma/migrations/20251208121020_update_admin_email_constraint_exclude_master/migration.sql`

```sql
CREATE UNIQUE INDEX "User_email_admin_unique"
ON "User"("email")
WHERE "role" = 'RESELLER_ADMIN_4MIGA_USER';
```

### How It Works

- **Partial Index**: The index only applies when `role` is `RESELLER_ADMIN_4MIGA_USER`
- **Uniqueness**: Ensures `email` is unique among RESELLER_ADMIN users only
- **MASTER_ADMIN Exclusion**: `MASTER_ADMIN_4MIGA_USER` is excluded to allow access to all stores
- **Allows**:
  - The same email can still be `USER` in multiple stores
  - The same email can be `MASTER_ADMIN` in multiple stores (for global access)
- **Prevents**: The same email cannot be `RESELLER_ADMIN` in multiple stores

## Implementation Details

### Schema.prisma

**Note**: This constraint is NOT defined in `schema.prisma` because Prisma does not support partial unique indexes in the schema definition. The constraint exists only in the database via SQL migration.

### Code Validation

In addition to the database constraint, the application code validates this rule in `UserService.promoteToAdmin()`:

```typescript
// Check if this email is already RESELLER_ADMIN in another store
// MASTER_ADMIN_4MIGA_USER is excluded as it can access all stores
const existingAdminInOtherStore = await this.prisma.user.findFirst({
  where: {
    email: user.email,
    role: 'RESELLER_ADMIN_4MIGA_USER',
    storeId: { not: adminStoreId },
  },
});

if (existingAdminInOtherStore) {
  throw new BadRequestException(
    'This email is already an administrator in another store',
  );
}
```

### Admin Login

The `adminLogin` endpoint filters by admin role directly in the query (both RESELLER_ADMIN and MASTER_ADMIN can login):

```typescript
const user = await this.prisma.user.findFirst({
  where: {
    email,
    role: {
      in: ['RESELLER_ADMIN_4MIGA_USER', 'MASTER_ADMIN_4MIGA_USER'],
    },
  },
  select: this.adminAuthUser,
});
```

**Note**: The query includes both roles for login purposes, but the unique constraint only applies to `RESELLER_ADMIN_4MIGA_USER`. For RESELLER_ADMIN, the constraint ensures at most one result per email. For MASTER_ADMIN, multiple results are allowed (one per store) as they need access to all stores.

## Behavior

### Allowed Scenarios

✅ `user@example.com` as `USER` in Store A
✅ `user@example.com` as `USER` in Store B
✅ `reseller@example.com` as `RESELLER_ADMIN` in Store A
✅ `reseller@example.com` as `USER` in Store B
✅ `master@example.com` as `MASTER_ADMIN` in Store A
✅ `master@example.com` as `MASTER_ADMIN` in Store B (allowed - global access)
✅ `master@example.com` as `MASTER_ADMIN` in Store C (allowed - global access)

### Prevented Scenarios

❌ `reseller@example.com` as `RESELLER_ADMIN` in Store A
❌ `reseller@example.com` as `RESELLER_ADMIN` in Store B (violates constraint)

## Migration Notes

- **No Breaking Changes**: Existing functionality continues to work
- **No Schema Changes**: The constraint is database-only
- **Backward Compatible**: Does not affect existing data unless violations exist

## Rollback

If needed, the constraint can be removed:

```sql
DROP INDEX IF EXISTS "User_email_admin_unique";
```

## Related Files

- Initial Migration: `prisma/migrations/20251208115512_add_unique_email_admin_constraint/migration.sql`
- Update Migration: `prisma/migrations/20251208121020_update_admin_email_constraint_exclude_master/migration.sql`
- Service: `src/user/user.service.ts` (promoteToAdmin method)
- Auth Service: `src/auth/auth.service.ts` (adminLogin method)
- Tests: `src/user/__tests__/user.service.spec.ts`
- Tests: `src/auth/__tests__/auth.service.spec.ts`

## Important Notes

- **MASTER_ADMIN Exclusion**: `MASTER_ADMIN_4MIGA_USER` is intentionally excluded from the constraint to allow global access across all stores
- **RESELLER_ADMIN Only**: The constraint applies only to `RESELLER_ADMIN_4MIGA_USER` to ensure one store per email
- **Login Behavior**: Both roles can login via `auth/admin/login`, but RESELLER_ADMIN will have a unique storeId, while MASTER_ADMIN may have multiple entries (one per store)


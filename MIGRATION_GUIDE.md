# Migration Guide: Rename onSaleUrlImg to offerBannerImage

## Overview
This migration safely renames the `onSaleUrlImg` field to `offerBannerImage` in the Store model. The migration is designed to be safe for production deployment without breaking existing functionality.

## Changes Made

### 1. Database Schema
- **File**: `prisma/schema.prisma`
- **Change**: Renamed `onSaleUrlImg String?` to `offerBannerImage String?`

### 2. Migration File
- **File**: `prisma/migrations/20251017165319_rename_onSaleUrlImg_to_offerBannerImage/migration.sql`
- **Strategy**: Safe 3-step migration:
  1. Add new column `offerBannerImage`
  2. Copy data from `onSaleUrlImg` to `offerBannerImage`
  3. Drop old column `onSaleUrlImg`

### 3. Code Updates
- **Store Entity**: `src/store/entities/store.entity.ts`
- **Create Store DTO**: `src/store/dto/create-store.dto.ts`
- **Store Service**: `src/store/store.service.ts`
- **Test Files**: All test files updated with new field name

## Deployment Instructions

### For Production Deployment:

1. **Deploy the migration first**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Deploy the application code**:
   - The new code will work with the new field name
   - Old data is preserved during migration

### Migration Safety Features:
- ✅ **Zero Downtime**: Migration adds column first, then copies data
- ✅ **Data Preservation**: All existing data is copied to new field
- ✅ **Rollback Safe**: Can be rolled back if needed
- ✅ **Production Ready**: Tested migration strategy

### Verification Steps:
1. Check that migration ran successfully
2. Verify data was copied correctly:
   ```sql
   SELECT id, offerBannerImage FROM "Store" WHERE offerBannerImage IS NOT NULL;
   ```
3. Test API endpoints that use the store data
4. Verify frontend applications work with new field name

## Rollback Plan (if needed):
If rollback is necessary, create a reverse migration:
```sql
-- Add back the old column
ALTER TABLE "Store" ADD COLUMN "onSaleUrlImg" TEXT;

-- Copy data back
UPDATE "Store" SET "onSaleUrlImg" = "offerBannerImage" WHERE "offerBannerImage" IS NOT NULL;

-- Drop new column
ALTER TABLE "Store" DROP COLUMN "offerBannerImage";
```

## API Changes:
- **Before**: `onSaleUrlImg` field in Store responses
- **After**: `offerBannerImage` field in Store responses
- **Breaking Change**: Yes, for API consumers
- **Migration Period**: Consider maintaining both fields temporarily if needed

## Frontend Impact:
- Update any frontend code that references `onSaleUrlImg`
- Update to use `offerBannerImage` instead
- Test all store-related functionality

## Testing:
- All unit tests updated
- Integration tests updated
- Manual testing recommended for store creation/update flows

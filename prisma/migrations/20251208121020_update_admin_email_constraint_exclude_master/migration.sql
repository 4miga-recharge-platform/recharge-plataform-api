-- Drop the existing index that includes MASTER_ADMIN_4MIGA_USER
DROP INDEX IF EXISTS "User_email_admin_unique";

-- Create new unique partial index: email must be unique when role is RESELLER_ADMIN only
-- MASTER_ADMIN_4MIGA_USER is excluded to allow access to all stores
CREATE UNIQUE INDEX "User_email_admin_unique"
ON "User"("email")
WHERE "role" = 'RESELLER_ADMIN_4MIGA_USER';


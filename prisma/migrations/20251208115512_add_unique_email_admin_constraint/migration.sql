-- Create unique partial index: email must be unique when role is ADMIN
-- This ensures an email can only be admin in one store
-- The same email can still be USER in multiple stores (allowed)
CREATE UNIQUE INDEX "User_email_admin_unique"
ON "User"("email")
WHERE "role" IN ('RESELLER_ADMIN_4MIGA_USER', 'MASTER_ADMIN_4MIGA_USER');


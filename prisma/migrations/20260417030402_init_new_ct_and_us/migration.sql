/*
  Warnings:

  - The values [CTU] on the enum `ReferralServiceCode` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ReferralServiceCode_new" AS ENUM ('DERM', 'OPH', 'DENT', 'ORTH', 'CARD', 'NEURO', 'FEL', 'ONC', 'PT', 'ENDO', 'GI', 'NEPH', 'ACU', 'EXOT', 'AQUA', 'CT', 'US', 'GIM', 'ASU');
ALTER TABLE "case_referrals" ALTER COLUMN "serviceCode" TYPE "ReferralServiceCode_new" USING ("serviceCode"::text::"ReferralServiceCode_new");
ALTER TYPE "ReferralServiceCode" RENAME TO "ReferralServiceCode_old";
ALTER TYPE "ReferralServiceCode_new" RENAME TO "ReferralServiceCode";
DROP TYPE "ReferralServiceCode_old";
COMMIT;

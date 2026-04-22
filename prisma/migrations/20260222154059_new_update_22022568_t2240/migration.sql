/*
  Warnings:

  - Added the required column `serviceId` to the `case_referrals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "case_referrals" ADD COLUMN     "serviceId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

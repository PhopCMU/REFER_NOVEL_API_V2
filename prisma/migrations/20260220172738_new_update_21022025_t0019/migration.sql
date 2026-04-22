/*
  Warnings:

  - A unique constraint covering the columns `[animal_codeId]` on the table `animal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cmu_codeId]` on the table `cmu_it_accounts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[owner_codeId]` on the table `owner` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vet_codeId]` on the table `veterinarian` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `animal_codeId` to the `animal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cmu_codeId` to the `cmu_it_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_codeId` to the `owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vet_codeId` to the `veterinarian` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReferralServiceCode" AS ENUM ('DERM', 'OPH', 'DENT', 'ORTH', 'CARD', 'NEURO', 'FEL', 'ONC', 'PT', 'ENDO', 'GI', 'NEPH', 'ACU', 'EXOT', 'AQUA');

-- CreateEnum
CREATE TYPE "MedicalFileCategory" AS ENUM ('HISTORY', 'LAB', 'XRAY', 'PHOTO', 'BIOPSY');

-- AlterTable
ALTER TABLE "animal" ADD COLUMN     "animal_codeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "cmu_it_accounts" ADD COLUMN     "cmu_codeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "owner" ADD COLUMN     "owner_codeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "veterinarian" ADD COLUMN     "expotp" TIMESTAMP(3),
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "vet_codeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "case_referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referenceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "referralType" "ReferralType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'PENDING',
    "serviceCode" "ReferralServiceCode" NOT NULL,
    "hospitalId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "petId" UUID NOT NULL,
    "adminId" UUID,
    "vetcmuId" UUID,
    "resultSummary" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "category" "MedicalFileCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicalFileId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resultData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_status_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseId" UUID NOT NULL,
    "oldStatus" "CaseStatus" NOT NULL,
    "newStatus" "CaseStatus" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_referrals_referenceNo_key" ON "case_referrals"("referenceNo");

-- CreateIndex
CREATE INDEX "case_referrals_hospitalId_idx" ON "case_referrals"("hospitalId");

-- CreateIndex
CREATE INDEX "case_referrals_veterinarianId_idx" ON "case_referrals"("veterinarianId");

-- CreateIndex
CREATE INDEX "case_referrals_petId_idx" ON "case_referrals"("petId");

-- CreateIndex
CREATE INDEX "case_referrals_serviceCode_idx" ON "case_referrals"("serviceCode");

-- CreateIndex
CREATE INDEX "case_referrals_status_idx" ON "case_referrals"("status");

-- CreateIndex
CREATE INDEX "appointments_caseId_idx" ON "appointments"("caseId");

-- CreateIndex
CREATE INDEX "appointments_date_idx" ON "appointments"("date");

-- CreateIndex
CREATE INDEX "medical_files_caseId_idx" ON "medical_files"("caseId");

-- CreateIndex
CREATE INDEX "medical_files_category_idx" ON "medical_files"("category");

-- CreateIndex
CREATE INDEX "lab_results_medicalFileId_idx" ON "lab_results"("medicalFileId");

-- CreateIndex
CREATE INDEX "case_status_logs_caseId_idx" ON "case_status_logs"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "animal_animal_codeId_key" ON "animal"("animal_codeId");

-- CreateIndex
CREATE UNIQUE INDEX "cmu_it_accounts_cmu_codeId_key" ON "cmu_it_accounts"("cmu_codeId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_owner_codeId_key" ON "owner"("owner_codeId");

-- CreateIndex
CREATE UNIQUE INDEX "veterinarian_vet_codeId_key" ON "veterinarian"("vet_codeId");

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_petId_fkey" FOREIGN KEY ("petId") REFERENCES "animal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "cmu_it_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_referrals" ADD CONSTRAINT "case_referrals_vetcmuId_fkey" FOREIGN KEY ("vetcmuId") REFERENCES "cmu_it_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_medicalFileId_fkey" FOREIGN KEY ("medicalFileId") REFERENCES "medical_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_status_logs" ADD CONSTRAINT "case_status_logs_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case_referrals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

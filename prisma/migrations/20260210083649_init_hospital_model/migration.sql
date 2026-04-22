/*
  Warnings:

  - You are about to drop the `Animal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Appointment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CaseReferral` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CaseStatusLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Clinic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feedback` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HospitalStaff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LabResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MedicalFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Owner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Veterinarian` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Animal" DROP CONSTRAINT "Animal_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_caseId_fkey";

-- DropForeignKey
ALTER TABLE "CaseReferral" DROP CONSTRAINT "CaseReferral_animalId_fkey";

-- DropForeignKey
ALTER TABLE "CaseReferral" DROP CONSTRAINT "CaseReferral_staffId_fkey";

-- DropForeignKey
ALTER TABLE "CaseReferral" DROP CONSTRAINT "CaseReferral_veterinarianId_fkey";

-- DropForeignKey
ALTER TABLE "CaseStatusLog" DROP CONSTRAINT "CaseStatusLog_caseId_fkey";

-- DropForeignKey
ALTER TABLE "LabResult" DROP CONSTRAINT "LabResult_medicalFileId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalFile" DROP CONSTRAINT "MedicalFile_caseId_fkey";

-- DropForeignKey
ALTER TABLE "Veterinarian" DROP CONSTRAINT "Veterinarian_clinicId_fkey";

-- DropTable
DROP TABLE "Animal";

-- DropTable
DROP TABLE "Appointment";

-- DropTable
DROP TABLE "CaseReferral";

-- DropTable
DROP TABLE "CaseStatusLog";

-- DropTable
DROP TABLE "Clinic";

-- DropTable
DROP TABLE "Feedback";

-- DropTable
DROP TABLE "HospitalStaff";

-- DropTable
DROP TABLE "LabResult";

-- DropTable
DROP TABLE "MedicalFile";

-- DropTable
DROP TABLE "Owner";

-- DropTable
DROP TABLE "Veterinarian";

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ipAddress" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'hospital',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

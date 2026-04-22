/*
  Warnings:

  - Added the required column `fileExtension` to the `medical_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileType` to the `medical_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `medical_files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `medical_files` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AllowedFileType" AS ENUM ('PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'IMAGE_JPG', 'IMAGE_JPEG', 'IMAGE_PNG', 'IMAGE_GIF', 'IMAGE_WEBP', 'IMAGE_BMP', 'IMAGE_SVG');

-- AlterTable
ALTER TABLE "medical_files" ADD COLUMN     "fileExtension" TEXT NOT NULL,
ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "fileKey" TEXT,
ADD COLUMN     "fileType" "AllowedFileType" NOT NULL,
ADD COLUMN     "isAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "uploadedBy" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "medical_files_fileType_idx" ON "medical_files"("fileType");

-- CreateIndex
CREATE INDEX "medical_files_isAllowed_idx" ON "medical_files"("isAllowed");

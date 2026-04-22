/*
  Warnings:

  - The values [PDF,DOC,DOCX,XLS,XLSX,IMAGE_JPG,IMAGE_JPEG,IMAGE_PNG,IMAGE_GIF,IMAGE_WEBP,IMAGE_BMP,IMAGE_SVG] on the enum `AllowedFileType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AllowedFileType_new" AS ENUM ('DOCUMENT', 'IMAGE', 'OTHER');
ALTER TABLE "medical_files" ALTER COLUMN "fileType" TYPE "AllowedFileType_new" USING ("fileType"::text::"AllowedFileType_new");
ALTER TYPE "AllowedFileType" RENAME TO "AllowedFileType_old";
ALTER TYPE "AllowedFileType_new" RENAME TO "AllowedFileType";
DROP TYPE "AllowedFileType_old";
COMMIT;

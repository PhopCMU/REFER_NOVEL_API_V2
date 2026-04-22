-- AlterTable
ALTER TABLE "medical_files" ADD COLUMN     "appointmentId" UUID;

-- CreateIndex
CREATE INDEX "medical_files_appointmentId_idx" ON "medical_files"("appointmentId");

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

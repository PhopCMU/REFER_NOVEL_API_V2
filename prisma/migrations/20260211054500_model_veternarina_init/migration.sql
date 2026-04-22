-- CreateTable
CREATE TABLE "veterinarian" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ceLicense" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "lineID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veterinarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_VeterinarianWorkplaces" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_VeterinarianWorkplaces_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "veterinarian_email_key" ON "veterinarian"("email");

-- CreateIndex
CREATE INDEX "_VeterinarianWorkplaces_B_index" ON "_VeterinarianWorkplaces"("B");

-- AddForeignKey
ALTER TABLE "_VeterinarianWorkplaces" ADD CONSTRAINT "_VeterinarianWorkplaces_A_fkey" FOREIGN KEY ("A") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VeterinarianWorkplaces" ADD CONSTRAINT "_VeterinarianWorkplaces_B_fkey" FOREIGN KEY ("B") REFERENCES "veterinarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

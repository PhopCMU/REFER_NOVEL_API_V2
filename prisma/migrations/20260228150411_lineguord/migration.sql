-- CreateTable
CREATE TABLE "LineGroup" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineGroup_groupId_key" ON "LineGroup"("groupId");

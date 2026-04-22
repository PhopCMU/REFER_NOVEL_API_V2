-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COUNTER', 'VETCMU', 'VET', 'USER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'SEND_MAIL', 'VIEW_PRIVATE');

-- CreateTable
CREATE TABLE "cmu_it_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cmu_it_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ipAddress" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cmu_it_accounts_email_key" ON "cmu_it_accounts"("email");

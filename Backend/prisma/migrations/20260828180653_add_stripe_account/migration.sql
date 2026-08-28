/*
  Warnings:

  - A unique constraint covering the columns `[stripeAccountId]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "stripeAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripeAccountId_key" ON "organizations"("stripeAccountId");

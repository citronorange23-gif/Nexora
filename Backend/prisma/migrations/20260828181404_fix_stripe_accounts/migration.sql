-- CreateTable
CREATE TABLE "stripe_accounts" (
    "id" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_stripeAccountId_key" ON "stripe_accounts"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_organizationId_key" ON "stripe_accounts"("organizationId");

-- AddForeignKey
ALTER TABLE "stripe_accounts" ADD CONSTRAINT "stripe_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

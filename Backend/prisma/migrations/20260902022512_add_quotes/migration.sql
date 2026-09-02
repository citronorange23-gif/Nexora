-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "taxRate" DECIMAL(5,4);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_saleId_key" ON "quotes"("saleId");

-- CreateIndex
CREATE INDEX "quotes_organizationId_idx" ON "quotes"("organizationId");

-- CreateIndex
CREATE INDEX "quotes_organizationId_status_idx" ON "quotes"("organizationId", "status");

-- CreateIndex
CREATE INDEX "quotes_organizationId_createdAt_idx" ON "quotes"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "quotes_customerId_idx" ON "quotes"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_organizationId_number_key" ON "quotes"("organizationId", "number");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_idx" ON "quote_items"("quoteId");

-- CreateIndex
CREATE INDEX "quote_items_productId_idx" ON "quote_items"("productId");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

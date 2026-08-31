CREATE TYPE "DocumentType" AS ENUM ('CONTRACT', 'QUOTE', 'INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'OTHER');

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "folder" TEXT,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_storagePath_key" ON "documents"("storagePath");
CREATE INDEX "documents_organizationId_createdAt_idx" ON "documents"("organizationId", "createdAt");
CREATE INDEX "documents_organizationId_type_idx" ON "documents"("organizationId", "type");
CREATE INDEX "documents_organizationId_customerId_idx" ON "documents"("organizationId", "customerId");

ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

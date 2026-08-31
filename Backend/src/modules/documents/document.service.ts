import { db } from "../../lib/db.js";
import type { ListDocumentsQuery, CreateDocumentMetadata } from "./document.schema.js";
import { deleteDocumentFile, readDocumentFile, saveDocumentFile } from "./document.storage.js";

const documentInclude = {
  customer: true,
  uploadedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

export async function getDocuments(organizationId: string, query: ListDocumentsQuery) {
  const documents = await db.document.findMany({
    where: {
      organizationId,
      type: query.type,
      customerId: query.customerId,
      folder: query.folder,
    },
    include: documentInclude,
    orderBy: { createdAt: "desc" },
  });

  const search = query.search?.toLowerCase();
  if (!search) return documents;

  return documents.filter((document) =>
    [
      document.name,
      document.originalName,
      document.description,
      document.folder,
      document.customer?.firstName,
      document.customer?.lastName,
      document.customer?.email,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(search)),
  );
}

export async function getDocumentById(organizationId: string, documentId: string) {
  return db.document.findFirst({
    where: { id: documentId, organizationId },
    include: documentInclude,
  });
}

export async function createDocument(
  organizationId: string,
  uploadedById: string,
  metadata: CreateDocumentMetadata,
  originalName: string,
  mimeType: string,
  buffer: Buffer,
) {
  if (metadata.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: metadata.customerId, organizationId },
      select: { id: true },
    });

    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
  }

  const stored = await saveDocumentFile(organizationId, mimeType, buffer);

  try {
    return await db.document.create({
      data: {
        name: metadata.name,
        type: metadata.type,
        description: metadata.description || null,
        folder: metadata.folder || null,
        originalName,
        storagePath: stored.storagePath,
        mimeType,
        size: buffer.length,
        organizationId,
        customerId: metadata.customerId ?? null,
        uploadedById,
      },
      include: documentInclude,
    });
  } catch (error) {
    await deleteDocumentFile(stored.storagePath).catch(() => undefined);
    throw error;
  }
}

export async function deleteDocument(organizationId: string, documentId: string) {
  const document = await db.document.findFirst({
    where: { id: documentId, organizationId },
    select: { id: true, storagePath: true },
  });

  if (!document) throw new Error("DOCUMENT_NOT_FOUND");

  await db.document.delete({ where: { id: document.id } });
  await deleteDocumentFile(document.storagePath).catch(() => undefined);
}

export async function getDocumentFile(organizationId: string, documentId: string) {
  const document = await db.document.findFirst({
    where: { id: documentId, organizationId },
  });

  if (!document) throw new Error("DOCUMENT_NOT_FOUND");

  try {
    const buffer = await readDocumentFile(document.storagePath);
    return { document, buffer };
  } catch {
    throw new Error("FILE_NOT_FOUND");
  }
}

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import { createDocumentMetadataSchema, listDocumentsQuerySchema } from "./document.schema.js";
import { MAX_DOCUMENT_SIZE, isAllowedMimeType } from "./document.storage.js";
import { createDocument, deleteDocument, getDocumentById, getDocumentFile, getDocuments } from "./document.service.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

function getId(req: Request) {
  const id = req.params.id;
  return typeof id === "string" ? id : null;
}

export async function getAllDocuments(req: Request, res: Response) {
  try {
    const auth = getAuth(req);
    const query = listDocumentsQuerySchema.parse(req.query);
    const documents = await getDocuments(auth.organizationId, query);
    return res.json({ success: true, data: documents });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, error: "Unable to fetch documents" });
  }
}

export async function getOneDocument(req: Request, res: Response) {
  try {
    const auth = getAuth(req);
    const id = getId(req);
    if (!id) return res.status(400).json({ success: false, error: "Invalid document ID" });

    const document = await getDocumentById(auth.organizationId, id);
    if (!document) return res.status(404).json({ success: false, error: "Document not found" });

    return res.json({ success: true, data: document });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Unable to fetch document" });
  }
}

export async function uploadDocument(req: Request, res: Response) {
  try {
    const auth = getAuth(req);
    const mimeType = req.headers["content-type"]?.split(";")[0]?.trim() ?? "";

    if (!isAllowedMimeType(mimeType)) {
      return res.status(415).json({ success: false, error: "Unsupported file type" });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ success: false, error: "File is required" });
    }

    if (req.body.length > MAX_DOCUMENT_SIZE) {
      return res.status(413).json({ success: false, error: "File is too large. Maximum size is 10 MB." });
    }

    const metadata = createDocumentMetadataSchema.parse({
      name: req.query.name,
      type: req.query.type || "OTHER",
      description: req.query.description || undefined,
      folder: req.query.folder || undefined,
      customerId: req.query.customerId || undefined,
    });

    const originalNameValue = req.query.originalName;
    const originalName = typeof originalNameValue === "string" && originalNameValue.trim()
      ? originalNameValue.trim().slice(0, 255)
      : metadata.name;

    const document = await createDocument(
      auth.organizationId,
      auth.userId,
      metadata,
      originalName,
      mimeType,
      req.body,
    );

    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Customer not found" });
    }

    if (error instanceof Error && error.message === "FILE_TOO_LARGE") {
      return res.status(413).json({ success: false, error: "File is too large. Maximum size is 10 MB." });
    }

    if (error instanceof Error && error.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(415).json({ success: false, error: "Unsupported file type" });
    }

    return res.status(400).json({ success: false, error: "Unable to upload document" });
  }
}

export async function downloadDocument(req: Request, res: Response) {
  try {
    const auth = getAuth(req);
    const id = getId(req);
    if (!id) return res.status(400).json({ success: false, error: "Invalid document ID" });

    const { document, buffer } = await getDocumentFile(auth.organizationId, id);

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(document.originalName)}`);

    return res.send(buffer);
  } catch (error) {
    if (error instanceof Error && (error.message === "DOCUMENT_NOT_FOUND" || error.message === "FILE_NOT_FOUND")) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    console.error(error);
    return res.status(500).json({ success: false, error: "Unable to download document" });
  }
}

export async function removeDocument(req: Request, res: Response) {
  try {
    const auth = getAuth(req);
    const id = getId(req);
    if (!id) return res.status(400).json({ success: false, error: "Invalid document ID" });

    await deleteDocument(auth.organizationId, id);
    return res.json({ success: true, message: "Document deleted" });
  } catch (error) {
    if (error instanceof Error && error.message === "DOCUMENT_NOT_FOUND") {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    console.error(error);
    return res.status(500).json({ success: false, error: "Unable to delete document" });
  }
}

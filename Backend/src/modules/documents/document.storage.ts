import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const uploadRoot = path.resolve(process.env.DOCUMENT_UPLOAD_DIR ?? "uploads/documents");

const allowedMimeTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/csv": ".csv",
};

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export function getExtensionForMimeType(mimeType: string) {
  return allowedMimeTypes[mimeType];
}

export function isAllowedMimeType(mimeType: string) {
  return Boolean(allowedMimeTypes[mimeType]);
}

export async function saveDocumentFile(
  organizationId: string,
  mimeType: string,
  buffer: Buffer,
) {
  const extension = getExtensionForMimeType(mimeType);

  if (!extension) {
    throw new Error("UNSUPPORTED_FILE_TYPE");
  }

  if (buffer.length > MAX_DOCUMENT_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }

  const directory = path.join(uploadRoot, organizationId);
  await fs.mkdir(directory, { recursive: true });

  const fileName = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(directory, fileName);

  await fs.writeFile(absolutePath, buffer);

  return {
    storagePath: path.relative(uploadRoot, absolutePath).replaceAll(path.sep, "/"),
    absolutePath,
  };
}

export async function deleteDocumentFile(storagePath: string) {
  const absolutePath = path.resolve(uploadRoot, storagePath);

  if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("INVALID_STORAGE_PATH");
  }

  await fs.rm(absolutePath, { force: true });
}

export async function readDocumentFile(storagePath: string) {
  const absolutePath = path.resolve(uploadRoot, storagePath);

  if (!absolutePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("INVALID_STORAGE_PATH");
  }

  return fs.readFile(absolutePath);
}

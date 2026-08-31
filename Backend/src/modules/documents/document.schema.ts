import { z } from "zod";

export const documentTypeSchema = z.enum([
  "CONTRACT",
  "QUOTE",
  "INVOICE",
  "RECEIPT",
  "CREDIT_NOTE",
  "OTHER",
]);

export const listDocumentsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  type: documentTypeSchema.optional(),
  customerId: z.string().uuid().optional(),
  folder: z.string().trim().min(1).optional(),
});

export const createDocumentMetadataSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: documentTypeSchema.default("OTHER"),
  description: z.string().trim().max(2000).optional(),
  folder: z.string().trim().max(100).optional(),
  customerId: z.string().uuid().optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;
export type CreateDocumentMetadata = z.infer<typeof createDocumentMetadataSchema>;

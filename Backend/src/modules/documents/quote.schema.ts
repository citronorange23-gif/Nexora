// Backend/src/modules/documents/quote.schema.ts

import { z } from "zod";

export const quoteItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

export const createQuoteSchema = z.object({
  customerId: z.string().uuid().optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
  items: z.array(quoteItemInputSchema).min(1),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const updateQuoteStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "SENT",
    "ACCEPTED",
    "REJECTED",
    "EXPIRED",
    "CONVERTED",
  ]),
});

export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;

export const listQuotesQuerySchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ])
    .optional(),

  customerId: z.string().uuid().optional(),

  search: z.string().trim().min(1).optional(),

  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;
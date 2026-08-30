import { z } from "zod";

export const listInvoicesQuerySchema = z.object({
  status: z
    .enum(["DRAFT", "ISSUED", "PAID", "VOID"])
    .optional(),

  customerId: z.string().uuid().optional(),

  search: z.string().trim().min(1).optional(),

  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type ListInvoicesQuery = z.infer<
  typeof listInvoicesQuerySchema
>;

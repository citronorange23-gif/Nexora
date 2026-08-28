import { z } from "zod";

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional(),

  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),

  taxRate: z.number().min(0).max(100).default(0),

  payment: z.object({
    method: z.enum([
      "CASH",
      "CARD",
      "INTERAC",
      "OTHER",
    ]),
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
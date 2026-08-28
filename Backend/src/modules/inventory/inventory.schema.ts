import { z } from "zod";

export const stockOperationSchema = z.object({
  quantity: z.number().int().positive(),
  reason: z.string().max(255).optional(),
});

export const adjustStockSchema = z.object({
  quantity: z.number().int().nonnegative(),
  reason: z.string().max(255).optional(),
});

export type StockOperationInput = z.infer<typeof stockOperationSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
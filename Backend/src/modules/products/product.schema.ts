import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().max(100).optional(),
  barcode: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),

  type: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),

  price: z.number().nonnegative(),
  costPrice: z.number().nonnegative().optional(),

  initialStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  maxStock: z.number().int().nonnegative().optional(),

  active: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema
  .omit({
    initialStock: true,
  })
  .partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
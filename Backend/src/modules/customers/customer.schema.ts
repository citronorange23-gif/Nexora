import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),

  email: z
    .string()
    .email()
    .max(255)
    .optional(),

  phone: z
    .string()
    .max(30)
    .optional(),

  notes: z
    .string()
    .max(1000)
    .optional(),
});

export const updateCustomerSchema =
  createCustomerSchema.partial();

export type CreateCustomerInput =
  z.infer<typeof createCustomerSchema>;

export type UpdateCustomerInput =
  z.infer<typeof updateCustomerSchema>;
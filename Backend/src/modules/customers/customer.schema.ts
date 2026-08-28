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

export const updateCustomerSchema = z.object({
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type CreateCustomerInput =
  z.infer<typeof createCustomerSchema>;

export type UpdateCustomerInput =
  z.infer<typeof updateCustomerSchema>;
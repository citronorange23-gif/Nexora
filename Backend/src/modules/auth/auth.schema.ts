import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),

  businessName: z.string().min(1).max(100),
  businessType: z.enum([
    "RETAIL",
    "RESTAURANT",
    "SALON",
    "BARBERSHOP",
    "GARAGE",
    "REAL_ESTATE",
    "GYM",
    "CLINIC",
    "FREELANCER",
    "OTHER",
  ]),

  phone: z.string().max(30).optional(),
  businessEmail: z.string().email().optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
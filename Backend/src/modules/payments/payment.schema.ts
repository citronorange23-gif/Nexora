import { z } from "zod";

/*
 * =====================================================
 * CREATE STRIPE CONNECT ACCOUNT
 * =====================================================
 */

export const createStripeAccountSchema = z.object({
  country: z
    .string()
    .length(
      2,
      "Le pays doit contenir 2 caractères.",
    )
    .toUpperCase()
    .default("CA"),

  email: z
    .string()
    .email("Adresse courriel invalide.")
    .optional(),
});

export type CreateStripeAccountInput =
  z.infer<typeof createStripeAccountSchema>;


/*
 * =====================================================
 * CONNECT ONBOARDING
 * =====================================================
 */

export const connectAccountSchema = z.object({
  returnUrl: z
    .string()
    .url("URL de retour invalide.")
    .optional(),

  refreshUrl: z
    .string()
    .url("URL de rafraîchissement invalide.")
    .optional(),
});

export type ConnectAccountInput =
  z.infer<typeof connectAccountSchema>;


/*
 * =====================================================
 * CREATE PAYMENT INTENT
 * =====================================================
 */

export const createPaymentIntentSchema = z.object({
  saleId: z
    .string()
    .uuid("ID de vente invalide."),
});

export type CreatePaymentIntentInput =
  z.infer<typeof createPaymentIntentSchema>;
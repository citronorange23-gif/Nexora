import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  connectAccountSchema,
  createPaymentIntentSchema,
} from "./payment.schema.js";

import {
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectAccountStatus,
  createPaymentIntent,
  handleStripeWebhookEvent
} from "./payment.service.js";

/*
 * =====================================================
 * CREATE STRIPE CONNECT ACCOUNT
 * =====================================================
 */

export async function createConnect(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const organizationId =
      req.user.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        error: "Organisation non trouvée.",
      });
    }

    const result =
      await createConnectAccount(
        organizationId,
      );

    return res.status(
      result.created ? 201 : 200,
    ).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "CREATE CONNECT ACCOUNT ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de créer le compte Stripe.",
    });
  }
}

/*
 * =====================================================
 * CREATE STRIPE CONNECT ONBOARDING LINK
 * =====================================================
 */

export async function createConnectOnboarding(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        error: "Organisation non trouvée.",
      });
    }

    const parsed =
      connectAccountSchema.safeParse(
        req.body ?? {},
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Données invalides.",
        details: parsed.error.flatten(),
      });
    }

    const result =
      await createConnectOnboardingLink(
        organizationId,
        parsed.data,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "CREATE CONNECT ONBOARDING ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de créer le lien Stripe.",
    });
  }
}

/*
 * =====================================================
 * GET STRIPE CONNECT STATUS
 * =====================================================
 */

export async function getConnectStatus(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const organizationId =
      req.user.organizationId;

    if (!organizationId) {
      return res.status(401).json({
        success: false,
        error: "Organisation non trouvée.",
      });
    }

    const result =
      await getConnectAccountStatus(
        organizationId,
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "GET CONNECT STATUS ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer le statut Stripe.",
    });
  }
}

export async function createPayment(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const organizationId =
      req.user.organizationId;

    const parsed =
      createPaymentIntentSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Données invalides.",
        details: parsed.error.flatten(),
      });
    }

    const result =
      await createPaymentIntent(
        organizationId,
        parsed.data.saleId,
      );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "CREATE PAYMENT INTENT ERROR:",
      error,
    );

    if (error instanceof Error) {
      switch (error.message) {
        case "SALE_NOT_FOUND":
          return res.status(404).json({
            success: false,
            error: "Vente introuvable.",
          });

        case "PAYMENT_NOT_FOUND":
          return res.status(404).json({
            success: false,
            error: "Paiement introuvable.",
          });

        case "INVALID_PAYMENT_METHOD":
          return res.status(400).json({
            success: false,
            error:
              "Cette vente n'utilise pas un paiement par carte.",
          });

        case "PAYMENT_ALREADY_PAID":
          return res.status(409).json({
            success: false,
            error: "Le paiement est déjà effectué.",
          });

        case "STRIPE_ACCOUNT_NOT_CONNECTED":
          return res.status(409).json({
            success: false,
            error:
              "Le compte Stripe de cette organisation n'est pas connecté.",
          });

        case "INVALID_PAYMENT_AMOUNT":
          return res.status(400).json({
            success: false,
            error: "Montant du paiement invalide.",
          });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Impossible de créer le paiement Stripe.",
    });
  }
}

// backend/.../payment.controller.ts (ajout)

export async function stripeWebhook(
  req: Request,
  res: Response,
) {
  const signature = req.headers["stripe-signature"];

  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({
      success: false,
      error: "Signature Stripe manquante ou invalide.",
    });
  }

  try {
    const result = await handleStripeWebhookEvent(
      req.body as Buffer,
      signature,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("STRIPE WEBHOOK ERROR:", error);

    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Signature ou payload invalide.",
    });
  }
}
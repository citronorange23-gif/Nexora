import Stripe from "stripe";

import { db } from "../../lib/db.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY est manquant dans les variables d'environnement.",
  );
}

const stripe = new Stripe(stripeSecretKey);

type ConnectAccountOptions = {
  returnUrl?: string;
  refreshUrl?: string;
};

/**
 * =====================================================
 * CREATE STRIPE CONNECT ACCOUNT
 * =====================================================
 */

export async function createConnectAccount(
  organizationId: string,
  options: ConnectAccountOptions = {},
) {
  const organization = await db.organization.findUnique({
    where: {
      id: organizationId,
    },
    include: {
      stripeAccount: true,
      business: true,
    },
  });

  if (!organization) {
    throw new Error("Organisation introuvable.");
  }

  /*
   * Si un compte Stripe existe déjà dans notre DB,
   * on le réutilise.
   */
  if (organization.stripeAccount) {
    return {
      stripeAccountId:
        organization.stripeAccount.stripeAccountId,

      created: false,

      chargesEnabled:
        organization.stripeAccount.chargesEnabled,

      payoutsEnabled:
        organization.stripeAccount.payoutsEnabled,

      detailsSubmitted:
        organization.stripeAccount.detailsSubmitted,
    };
  }

  /*
   * Si l'ancien champ Organization.stripeAccountId
   * existe déjà mais que StripeAccount n'existe pas,
   * on récupère le compte existant.
   */
  if (organization.stripeAccountId) {
    const account = await stripe.accounts.retrieve(
      organization.stripeAccountId,
    );

    const stripeAccount =
      await db.stripeAccount.create({
        data: {
          stripeAccountId: account.id,
          organizationId: organization.id,
          chargesEnabled:
            account.charges_enabled,
          payoutsEnabled:
            account.payouts_enabled,
          detailsSubmitted:
            account.details_submitted,
        },
      });

    return {
      stripeAccountId: stripeAccount.stripeAccountId,
      created: false,
      chargesEnabled: stripeAccount.chargesEnabled,
      payoutsEnabled: stripeAccount.payoutsEnabled,
      detailsSubmitted:
        stripeAccount.detailsSubmitted,
    };
  }

  /*
   * Création du compte Stripe Connect Express.
   */
  const account = await stripe.accounts.create({
    type: "express",

    country:
      organization.business?.country ?? "CA",

    capabilities: {
      card_payments: {
        requested: true,
      },

      transfers: {
        requested: true,
      },
    },

    metadata: {
      organizationId: organization.id,
    },
  });

  /*
   * On garde l'ID directement sur Organization.
   */
  await db.organization.update({
    where: {
      id: organization.id,
    },

    data: {
      stripeAccountId: account.id,
    },
  });

  /*
   * Et on crée notre enregistrement StripeAccount.
   */
  const stripeAccount =
    await db.stripeAccount.create({
      data: {
        stripeAccountId: account.id,
        organizationId: organization.id,

        chargesEnabled:
          account.charges_enabled,

        payoutsEnabled:
          account.payouts_enabled,

        detailsSubmitted:
          account.details_submitted,
      },
    });

  return {
    stripeAccountId: stripeAccount.stripeAccountId,

    created: true,

    chargesEnabled:
      stripeAccount.chargesEnabled,

    payoutsEnabled:
      stripeAccount.payoutsEnabled,

    detailsSubmitted:
      stripeAccount.detailsSubmitted,
  };
}

/**
 * =====================================================
 * CREATE CONNECT ONBOARDING LINK
 * =====================================================
 */

export async function createConnectOnboardingLink(
  organizationId: string,
  options: ConnectAccountOptions = {},
) {
  const organization =
    await db.organization.findUnique({
      where: {
        id: organizationId,
      },

      include: {
        stripeAccount: true,
      },
    });

  if (!organization) {
    throw new Error("Organisation introuvable.");
  }

  let stripeAccountId =
    organization.stripeAccountId;

  /*
   * Aucun compte Stripe :
   * on en crée un.
   */
  if (!stripeAccountId) {
    const result =
      await createConnectAccount(
        organizationId,
        options,
      );

    stripeAccountId =
      result.stripeAccountId;
  }

  const returnUrl =
    options.returnUrl ??
    process.env.STRIPE_CONNECT_RETURN_URL;

  const refreshUrl =
    options.refreshUrl ??
    process.env.STRIPE_CONNECT_REFRESH_URL;

  if (!returnUrl || !refreshUrl) {
    throw new Error(
      "STRIPE_CONNECT_RETURN_URL et STRIPE_CONNECT_REFRESH_URL sont requis.",
    );
  }

  const accountLink =
    await stripe.accountLinks.create({
      account: stripeAccountId,

      refresh_url: refreshUrl,

      return_url: returnUrl,

      type: "account_onboarding",
    });

  return {
    url: accountLink.url,

    stripeAccountId,
  };
}

/**
 * =====================================================
 * GET CONNECT ACCOUNT STATUS
 * =====================================================
 */

export async function getConnectAccountStatus(
  organizationId: string,
) {
  const organization =
    await db.organization.findUnique({
      where: {
        id: organizationId,
      },

      include: {
        stripeAccount: true,
      },
    });

  if (!organization) {
    throw new Error("Organisation introuvable.");
  }

  if (!organization.stripeAccountId) {
    return {
      connected: false,

      stripeAccountId: null,

      chargesEnabled: false,

      payoutsEnabled: false,

      detailsSubmitted: false,

      requirements: null,
    };
  }

  /*
   * On récupère la vraie situation
   * directement depuis Stripe.
   */
  const account =
    await stripe.accounts.retrieve(
      organization.stripeAccountId,
    );

  /*
   * On synchronise notre DB avec Stripe.
   */
  await db.stripeAccount.upsert({
    where: {
      organizationId: organization.id,
    },

    create: {
      stripeAccountId: account.id,

      organizationId: organization.id,

      chargesEnabled:
        account.charges_enabled,

      payoutsEnabled:
        account.payouts_enabled,

      detailsSubmitted:
        account.details_submitted,
    },

    update: {
      stripeAccountId: account.id,

      chargesEnabled:
        account.charges_enabled,

      payoutsEnabled:
        account.payouts_enabled,

      detailsSubmitted:
        account.details_submitted,
    },
  });

  return {
    connected: true,

    stripeAccountId: account.id,

    chargesEnabled:
      account.charges_enabled,

    payoutsEnabled:
      account.payouts_enabled,

    detailsSubmitted:
      account.details_submitted,

    requirements: account.requirements
      ? {
          currentlyDue:
            account.requirements.currently_due,

          eventuallyDue:
            account.requirements.eventually_due,

          pastDue:
            account.requirements.past_due,
        }
      : null,
  };
}

export async function createPaymentIntent(
  organizationId: string,
  saleId: string,
) {
  const sale = await db.sale.findFirst({
    where: {
      id: saleId,
      organizationId,
    },
    include: {
      payment: true,
    },
  });

  if (!sale) {
    throw new Error("SALE_NOT_FOUND");
  }

  if (!sale.payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  if (sale.payment.method !== "CARD") {
    throw new Error("INVALID_PAYMENT_METHOD");
  }

  if (sale.payment.status === "PAID") {
    throw new Error("PAYMENT_ALREADY_PAID");
  }

  const organization = await db.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      stripeAccountId: true,
    },
  });

  if (!organization) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  if (!organization.stripeAccountId) {
    throw new Error("STRIPE_ACCOUNT_NOT_CONNECTED");
  }

    const REUSABLE_INTENT_STATUSES = new Set([
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "processing",
    "succeeded",
  ]);

  if (sale.payment.transactionId) {
    const existingIntent =
      await stripe.paymentIntents.retrieve(
        sale.payment.transactionId,
        {},
        {
          stripeAccount:
            organization.stripeAccountId,
        },
      );

    if (REUSABLE_INTENT_STATUSES.has(existingIntent.status)) {
      return {
        paymentIntentId: existingIntent.id,
        clientSecret: existingIntent.client_secret,
        status: existingIntent.status,
        reused: true,
      };
    }
  }

  /*
   * Stripe travaille en cents.
   *
   * Exemple :
   * 25.99 $ → 2599
   */
  const amount = Math.round(
    Number(sale.total) * 100,
  );

  if (amount <= 0) {
    throw new Error("INVALID_PAYMENT_AMOUNT");
  }

  const paymentIntent =
    await stripe.paymentIntents.create(
      {
        amount,
        currency: "cad",

        automatic_payment_methods: {
          enabled: true,
        },

        metadata: {
          saleId: sale.id,
          organizationId,
        },
      },
      {
        stripeAccount:
          organization.stripeAccountId,
      },
    );

  await db.payment.update({
    where: {
      saleId: sale.id,
    },
    data: {
      transactionId: paymentIntent.id,
      status: "PENDING",
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status,
    reused: false,
  };
}

// backend/.../payment.service.ts (ajout)

export async function handleStripeWebhookEvent(
  rawBody: Buffer,
  signature: string,
) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET est manquant dans les variables d'environnement.",
    );
  }

  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    webhookSecret,
  );

  switch (event.type) {
    // payment.service.ts, dans handleStripeWebhookEvent

  case "payment_intent.succeeded": {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const payment = await db.payment.findFirst({
    where: { transactionId: paymentIntent.id },
    include: {
      sale: {
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!payment || payment.status === "PAID") {
    break;
  }

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID" },
    });

    for (const item of payment.sale.items) {
      if (item.product.type === "SERVICE") {
        continue;
      }

      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });

      await tx.inventoryMovement.create({
        data: {
          type: "SALE",
          quantity: -item.quantity,
          reason: `Sale ${payment.saleId}`,
          productId: item.productId,
          organizationId: payment.sale.organizationId,
        },
      });
    }
  });

  break;
}

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await db.payment.updateMany({
        where: {
          transactionId: paymentIntent.id,
        },
        data: {
          status: "FAILED",
        },
      });

      break;
    }

    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await db.payment.updateMany({
        where: {
          transactionId: paymentIntent.id,
        },
        data: {
          status: "FAILED",
        },
      });

      break;
    }

    default:
      break;
  }

  return { received: true };
}
import { db } from "../../lib/db.js";
import type { CreateSaleInput } from "./sale.schema.js";
import { refundStripePayment } from "../payments/payment.service.js"

export async function createSale(
  organizationId: string,
  input: CreateSaleInput,
) {
  return db.$transaction(async (tx) => {
    // ─────────────────────────────
    // 1. Vérifier le client
    // ─────────────────────────────

    if (input.customerId) {
      const customer = await tx.customer.findFirst({
        where: {
          id: input.customerId,
          organizationId,
        },
      });

      if (!customer) {
        throw new Error("CUSTOMER_NOT_FOUND");
      }
    }

    // ─────────────────────────────
    // 2. Charger les produits
    // ─────────────────────────────

    const productIds = [
      ...new Set(input.items.map((item) => item.productId)),
    ];

    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        organizationId,
        active: true,
      },
      include: {
        inventory: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    // ─────────────────────────────
    // 3. Vérifier les stocks
    // ─────────────────────────────

    for (const item of input.items) {
      const product = products.find(
        (product) => product.id === item.productId,
      );

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if (
        product.type === "PRODUCT" &&
        (!product.inventory ||
          product.inventory.quantity < item.quantity)
      ) {
        throw new Error(
          `INSUFFICIENT_STOCK:${product.id}`,
        );
      }
    }

    // ─────────────────────────────
    // 4. Calculer les montants
    // ─────────────────────────────

    let subtotal = 0;

    const saleItems = input.items.map((item) => {
      const product = products.find(
        (product) => product.id === item.productId,
      );

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const unitPrice = Number(product.price);

      const totalPrice =
        unitPrice * item.quantity;

      subtotal += totalPrice;

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const tax =
      subtotal * (input.taxRate / 100);

    const total = subtotal + tax;

    // ─────────────────────────────
    // 5. Créer la vente
    // ─────────────────────────────

    const isCardPayment =
  input.payment.method === "CARD";

const sale = await tx.sale.create({
  data: {
    organizationId,
    customerId: input.customerId,

    subtotal,
    tax,
    total,

    status: "COMPLETED",

    items: {
      create: saleItems,
    },

    payment: {
      create: {
        method: input.payment.method,
        status: isCardPayment ? "PENDING" : "PAID",
        amount: total,
      },
    },
  },

  include: {
    customer: true,
    items: {
      include: {
        product: true,
      },
    },
    payment: true,
  },
});

        // ─────────────────────────────
    // 6. Déduire le stock
    //    (seulement si le paiement est déjà validé —
    //     CASH est payé immédiatement, CARD attend le webhook)
    // ─────────────────────────────

    if (!isCardPayment) {
      for (const item of input.items) {
        const product = products.find(
          (product) => product.id === item.productId,
        );

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        if (product.type === "SERVICE") {
          continue;
        }

        await tx.inventory.update({
          where: {
            productId: product.id,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            type: "SALE",
            quantity: -item.quantity,
            reason: `Sale ${sale.id}`,
            productId: product.id,
            organizationId,
          },
        });
      }
    }

    return sale;
  });
}

export async function getSales(organizationId: string) {
  return db.sale.findMany({
    where: {
      organizationId,
      payment: {
        status: { not: "PENDING" },
      },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSaleById(
  organizationId: string,
  saleId: string,
) {
  return db.sale.findFirst({
    where: {
      id: saleId,
      organizationId,
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
      payment: true,
    },
  });
}

export async function cancelSale(
  organizationId: string,
  saleId: string,
) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: {
        id: saleId,
        organizationId,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (!sale) {
      throw new Error("SALE_NOT_FOUND");
    }

    if (sale.status !== "COMPLETED") {
      throw new Error("SALE_NOT_COMPLETED");
    }

    if (
      sale.payment?.method === "CARD" &&
      sale.payment.status === "PAID"
    ) {
      throw new Error("CARD_PAYMENT_ALREADY_PAID");
    }

    // Remettre le stock
    for (const item of sale.items) {
      if (item.product.type === "SERVICE") {
        continue;
      }

      await tx.inventory.update({
        where: {
          productId: item.productId,
        },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          type: "RETURN",
          quantity: item.quantity,
          reason: `Cancellation ${sale.id}`,
          productId: item.productId,
          organizationId,
        },
      });
    }

    const updatedSale = await tx.sale.update({
      where: {
        id: sale.id,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    return updatedSale;
  });
}

export async function refundSale(
  organizationId: string,
  saleId: string,
) {
  const sale = await db.sale.findFirst({
    where: {
      id: saleId,
      organizationId,
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      payment: true,
    },
  });

  if (!sale) {
    throw new Error("SALE_NOT_FOUND");
  }

  if (sale.status !== "COMPLETED") {
    throw new Error("SALE_NOT_COMPLETED");
  }

  if (!sale.payment) {
    throw new Error("PAYMENT_NOT_FOUND");
  }

  if (sale.payment.status === "REFUNDED") {
    throw new Error("ALREADY_REFUNDED");
  }

  // ─────────────────────────────
  // Remboursement Stripe
  // (avant toute écriture en DB — si ça échoue,
  //  rien n'est modifié)
  // ─────────────────────────────

  if (
    sale.payment.method === "CARD" &&
    sale.payment.transactionId
  ) {
    await refundStripePayment(
      organizationId,
      sale.payment.transactionId,
      Number(sale.payment.amount),
    );
  }

  return db.$transaction(async (tx) => {
    // Remettre le stock
    for (const item of sale.items) {
      if (item.product.type === "SERVICE") {
        continue;
      }

      await tx.inventory.update({
        where: {
          productId: item.productId,
        },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          type: "RETURN",
          quantity: item.quantity,
          reason: `Refund ${sale.id}`,
          productId: item.productId,
          organizationId,
        },
      });
    }

    // Rembourser le paiement
    await tx.payment.update({
      where: {
        saleId: sale.id,
      },
      data: {
        status: "REFUNDED",
      },
    });

    // Marquer la vente comme remboursée
    const updatedSale = await tx.sale.update({
      where: {
        id: sale.id,
      },
      data: {
        status: "REFUNDED",
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    return updatedSale;
  });
}

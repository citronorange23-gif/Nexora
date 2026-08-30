import { db } from "../../lib/db.js";
import type { CreateSaleInput } from "./sale.schema.js";
import { refundStripePayment } from "../payments/payment.service.js"
import { createInvoiceForSale } from "../documents/document.service.js";

import { mailer } from "../../lib/mailer.js";

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

      // ─────────────────────────────
      // 7. Facture (paiement comptant payé immédiatement —
      //    pour CARD, la facture est créée par le webhook Stripe
      //    une fois le paiement réellement confirmé)
      // ─────────────────────────────

      const invoice = await createInvoiceForSale(
        tx,
        organizationId,
        sale,
      );

      return { ...sale, invoice };
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
      invoice: true,
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
      invoice: true,
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

function buildReceiptHtml(sale: NonNullable<Awaited<ReturnType<typeof getSaleById>>>) {
  const rows = sale.items
    .map(
      (item) => `
        <tr>
          <td>${item.product.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${Number(item.unitPrice).toFixed(2)} $</td>
          <td style="text-align:right">${Number(item.totalPrice).toFixed(2)} $</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
      <h2 style="text-align:center">Nexora</h2>
      <p style="text-align:center; color:#666;">
        ${new Date(sale.createdAt).toLocaleString("fr-CA")}
      </p>
      <hr />
      <table style="width:100%; font-size:14px; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left">Article</th>
            <th>Qté</th>
            <th style="text-align:right">P.U.</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <hr />
      <table style="width:100%; font-size:14px;">
        <tr><td>Sous-total</td><td style="text-align:right">${Number(sale.subtotal).toFixed(2)} $</td></tr>
        <tr><td>Taxes</td><td style="text-align:right">${Number(sale.tax).toFixed(2)} $</td></tr>
        <tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${Number(sale.total).toFixed(2)} $</strong></td></tr>
      </table>
      <hr />
      <p style="text-align:center; color:#666;">Merci de votre visite!</p>
    </div>
  `;
}

export async function emailSaleReceipt(
  organizationId: string,
  saleId: string,
  email: string,
) {
  const sale = await getSaleById(organizationId, saleId);

  if (!sale) {
    throw new Error("SALE_NOT_FOUND");
  }

  const business = await db.business.findUnique({
    where: { organizationId },
    select: { name: true, receiptEmail: true },
  });

  await mailer.sendMail({
    from: `"${business?.name ?? "Nexora"}" <${process.env.SMTP_FROM}>`,
    replyTo: business?.receiptEmail ?? undefined,
    to: email,
    subject: "Votre reçu Nexora",
    html: buildReceiptHtml(sale),
  });
}
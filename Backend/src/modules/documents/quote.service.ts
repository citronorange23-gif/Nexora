// Backend/src/modules/documents/quote.service.ts

import PDFDocument from "pdfkit";

import { db } from "../../lib/db.js";
import { getNextDocumentNumber } from "./document.service.js";

import type { PrismaClient } from "../../generated/prisma/client.js";
import type { CreateQuoteInput, ListQuotesQuery } from "./quote.schema.js";

type TransactionClient = Parameters<PrismaClient["$transaction"]>[0] extends (tx: infer T) => unknown ? T : never;

const quoteInclude = {
  customer: true,
  items: { include: { product: true } },
} as const;

/**
 * =====================================================
 * CRÉATION
 * =====================================================
 *
 * Le devis est créé manuellement (pas depuis une vente).
 * Les prix unitaires viennent du frontend mais quantity/
 * unitPrice sont recalculés ici pour le total — jamais
 * de confiance dans un total envoyé par le client.
 *
 * Le taux de taxe utilisé est celui de l'entreprise
 * (Business.taxRate). Si absent, taxe = 0.
 */
export async function createQuote(
  organizationId: string,
  input: CreateQuoteInput,
) {
  return db.$transaction(async (tx: TransactionClient) => {
    const business = await tx.business.findUnique({
      where: { organizationId },
    });

    const taxRate = Number(business?.taxRate ?? 0);

    const products = await tx.product.findMany({
      where: {
        organizationId,
        id: { in: input.items.map((item) => item.productId) },
      },
    });

    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    let subtotal = 0;

    const itemsData = input.items.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const totalPrice = item.quantity * item.unitPrice;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice as never,
        totalPrice: totalPrice as never,
      };
    });

    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const number = await getNextDocumentNumber(
      tx,
      organizationId,
      "DEV",
    );

    return tx.quote.create({
      data: {
        number,
        status: "DRAFT",

        subtotal: subtotal as never,
        tax: tax as never,
        total: total as never,

        validUntil: input.validUntil,
        notes: input.notes,

        organizationId,
        customerId: input.customerId,

        items: {
          create: itemsData,
        },
      },
      include: quoteInclude,
    });
  });
}

/**
 * =====================================================
 * LECTURE
 * =====================================================
 */

export async function getQuotes(
  organizationId: string,
  query: ListQuotesQuery,
) {
  const search = query.search?.toLowerCase();

  const quotes = await db.quote.findMany({
    where: {
      organizationId,

      status: query.status,
      customerId: query.customerId,

      createdAt: {
        gte: query.dateFrom,
        lte: query.dateTo,
      },
    },
    include: quoteInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!search) {
    return quotes;
  }

  return quotes.filter((quote) => {
    const customerName = `${quote.customer?.firstName ?? ""} ${
      quote.customer?.lastName ?? ""
    }`.toLowerCase();

    return (
      quote.number.toLowerCase().includes(search) ||
      customerName.includes(search) ||
      quote.customer?.email?.toLowerCase().includes(search)
    );
  });
}

export async function getQuoteById(
  organizationId: string,
  quoteId: string,
) {
  return db.quote.findFirst({
    where: {
      id: quoteId,
      organizationId,
    },
    include: quoteInclude,
  });
}

/**
 * =====================================================
 * STATUT
 * =====================================================
 */
export async function updateQuoteStatus(
  organizationId: string,
  quoteId: string,
  status: string,
) {
  const quote = await db.quote.findFirst({
    where: { id: quoteId, organizationId },
  });

  if (!quote) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  return db.quote.update({
    where: { id: quoteId },
    data: { status: status as never },
    include: quoteInclude,
  });
}

/**
 * =====================================================
 * CONVERSION EN VENTE
 * =====================================================
 *
 * Un devis ACCEPTED peut être converti en vente (Sale),
 * qui suit ensuite le flow normal de paiement → facture
 * (createInvoiceForSale dans document.service.ts).
 */
export async function convertQuoteToSale(
  organizationId: string,
  quoteId: string,
) {
  return db.$transaction(async (tx: TransactionClient) => {
    const quote = await tx.quote.findFirst({
      where: { id: quoteId, organizationId },
      include: { items: true },
    });

    if (!quote) {
      throw new Error("QUOTE_NOT_FOUND");
    }

    if (quote.status !== "ACCEPTED") {
      throw new Error("QUOTE_NOT_ACCEPTED");
    }

    const sale = await tx.sale.create({
      data: {
        organizationId,
        customerId: quote.customerId,

        subtotal: quote.subtotal as never,
        tax: quote.tax as never,
        total: quote.total as never,

        items: {
          create: quote.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice as never,
            totalPrice: item.totalPrice as never,
          })),
        },
      },
    });

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "CONVERTED", saleId: sale.id },
    });

    return sale;
  });
}

/**
 * =====================================================
 * PDF
 * =====================================================
 */

function formatMoney(value: unknown) {
  return `${Number(value).toFixed(2)} $`;
}

export async function generateQuotePdf(
  organizationId: string,
  quoteId: string,
) {
  const quote = await getQuoteById(organizationId, quoteId);

  if (!quote) {
    throw new Error("QUOTE_NOT_FOUND");
  }

  const business = await db.business.findUnique({
    where: { organizationId },
  });

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc
    .fontSize(20)
    .text(business?.name ?? "Nexora", { continued: false });

  doc.fontSize(10).fillColor("#555");

  const businessLines = [
    business?.address,
    [business?.city, business?.province, business?.postalCode]
      .filter(Boolean)
      .join(", "),
    business?.phone,
    business?.email,
  ].filter(Boolean) as string[];

  for (const line of businessLines) {
    doc.text(line);
  }

  doc.moveDown(1.5);

  doc
    .fillColor("#000")
    .fontSize(16)
    .text(`Devis ${quote.number}`);

  doc
    .fontSize(10)
    .fillColor("#555")
    .text(`Émis le ${quote.issuedAt.toLocaleDateString("fr-CA")}`)
    .text(`Statut : ${quote.status}`);

  if (quote.validUntil) {
    doc.text(
      `Valide jusqu'au ${quote.validUntil.toLocaleDateString("fr-CA")}`,
    );
  }

  doc.moveDown(1);

  const customerName = quote.customer
    ? `${quote.customer.firstName ?? ""} ${
        quote.customer.lastName ?? ""
      }`.trim() || quote.customer.email || "Client"
    : "Client";

  doc.fillColor("#000").fontSize(11).text("Destiné à :");
  doc.fontSize(10).fillColor("#333").text(customerName);

  if (quote.customer?.email) {
    doc.text(quote.customer.email);
  }

  if (quote.customer?.phone) {
    doc.text(quote.customer.phone);
  }

  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(11);

  const tableTop = doc.y;

  doc.text("Article", 50, tableTop);
  doc.text("Qté", 300, tableTop, { width: 50, align: "right" });
  doc.text("P.U.", 360, tableTop, { width: 80, align: "right" });
  doc.text("Total", 450, tableTop, { width: 95, align: "right" });

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(545, tableTop + 15)
    .strokeColor("#ccc")
    .stroke();

  let y = tableTop + 22;

  doc.fontSize(10).fillColor("#333");

  for (const item of quote.items) {
    doc.text(item.product.name, 50, y, { width: 240 });
    doc.text(String(item.quantity), 300, y, {
      width: 50,
      align: "right",
    });
    doc.text(formatMoney(item.unitPrice), 360, y, {
      width: 80,
      align: "right",
    });
    doc.text(formatMoney(item.totalPrice), 450, y, {
      width: 95,
      align: "right",
    });

    y += 20;
  }

  doc
    .moveTo(50, y + 5)
    .lineTo(545, y + 5)
    .strokeColor("#ccc")
    .stroke();

  y += 15;

  doc.fontSize(10).fillColor("#333");
  doc.text("Sous-total", 360, y, { width: 80, align: "right" });
  doc.text(formatMoney(quote.subtotal), 450, y, {
    width: 95,
    align: "right",
  });

  y += 18;

  doc.text("Taxes", 360, y, { width: 80, align: "right" });
  doc.text(formatMoney(quote.tax), 450, y, {
    width: 95,
    align: "right",
  });

  y += 22;

  doc.fontSize(12).fillColor("#000");
  doc.text("Total", 360, y, { width: 80, align: "right" });
  doc.text(formatMoney(quote.total), 450, y, {
    width: 95,
    align: "right",
  });

  doc.moveDown(3);

  doc
    .fontSize(9)
    .fillColor("#999")
    .text(
      "Ce devis est valide selon les conditions ci-dessus.",
      50,
      doc.y,
      { align: "center", width: 495 },
    );

  doc.end();

  return { quote, buffer: await done };
}
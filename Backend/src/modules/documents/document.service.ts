import PDFDocument from "pdfkit";

import { db } from "../../lib/db.js";

import type { PrismaClient } from "../../generated/prisma/client.js";
import type { ListInvoicesQuery } from "./document.schema.js";

type TransactionClient = Parameters<
  PrismaClient["$transaction"]
>[0] extends (tx: infer T) => unknown
  ? T
  : never;

/**
 * =====================================================
 * NUMÉROTATION
 * =====================================================
 *
 * Un compteur par organisation, par préfixe (INV, DEV, REC...)
 * et par année. L'incrément passe par une seule requête SQL
 * atomique (upsert + increment géré par Postgres), donc deux
 * requêtes simultanées ne peuvent jamais obtenir le même numéro.
 *
 * Ne jamais compter les documents existants côté frontend ou
 * en relisant `count()` : ce n'est pas sûr en cas de concurrence.
 */
export async function getNextDocumentNumber(
  tx: TransactionClient,
  organizationId: string,
  prefix: string,
) {
  const year = new Date().getFullYear();

  const counter = await tx.documentCounter.upsert({
    where: {
      organizationId_prefix_year: {
        organizationId,
        prefix,
        year,
      },
    },
    create: {
      organizationId,
      prefix,
      year,
      lastNumber: 1,
    },
    update: {
      lastNumber: { increment: 1 },
    },
  });

  const sequence = counter.lastNumber
    .toString()
    .padStart(6, "0");

  return `${prefix}-${year}-${sequence}`;
}

/**
 * =====================================================
 * CRÉATION AUTOMATIQUE DEPUIS UNE VENTE
 * =====================================================
 *
 * Appelée uniquement quand le paiement d'une vente est
 * confirmé (comptant immédiat, ou webhook Stripe pour la
 * carte) — jamais sur la simple réponse du frontend.
 *
 * Idempotente : si une facture existe déjà pour cette vente
 * (contrainte unique sur saleId), on la retourne telle quelle.
 */
export async function createInvoiceForSale(
  tx: TransactionClient,
  organizationId: string,
  sale: {
    id: string;
    customerId: string | null;
    subtotal: number | string;
    tax: number | string;
    total: number | string;
  },
) {
  const existing = await tx.invoice.findUnique({
    where: { saleId: sale.id },
  });

  if (existing) {
    return existing;
  }

  const number = await getNextDocumentNumber(
    tx,
    organizationId,
    "INV",
  );

  return tx.invoice.create({
    data: {
      number,
      status: "PAID",

      subtotal: sale.subtotal,
      tax: sale.tax,
      total: sale.total,

      organizationId,
      saleId: sale.id,
      customerId: sale.customerId,
    },
  });
}

/**
 * =====================================================
 * LECTURE
 * =====================================================
 */

const invoiceInclude = {
  customer: true,
  sale: {
    include: {
      items: { include: { product: true } },
      payment: true,
    },
  },
} as const;

export async function getInvoices(
  organizationId: string,
  query: ListInvoicesQuery,
) {
  const search = query.search?.toLowerCase();

  const invoices = await db.invoice.findMany({
    where: {
      organizationId,

      status: query.status,
      customerId: query.customerId,

      createdAt: {
        gte: query.dateFrom,
        lte: query.dateTo,
      },
    },
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });

  if (!search) {
    return invoices;
  }

  return invoices.filter((invoice) => {
    const customerName = `${invoice.customer?.firstName ?? ""} ${
      invoice.customer?.lastName ?? ""
    }`.toLowerCase();

    return (
      invoice.number.toLowerCase().includes(search) ||
      customerName.includes(search) ||
      invoice.customer?.email
        ?.toLowerCase()
        .includes(search)
    );
  });
}

export async function getInvoiceById(
  organizationId: string,
  invoiceId: string,
) {
  return db.invoice.findFirst({
    where: {
      id: invoiceId,
      organizationId,
    },
    include: invoiceInclude,
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

export async function generateInvoicePdf(
  organizationId: string,
  invoiceId: string,
) {
  const invoice = await getInvoiceById(
    organizationId,
    invoiceId,
  );

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
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

  // ── En-tête entreprise ──────────────────────────

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

  // ── Titre facture ───────────────────────────────

  doc
    .fillColor("#000")
    .fontSize(16)
    .text(`Facture ${invoice.number}`);

  doc
    .fontSize(10)
    .fillColor("#555")
    .text(
      `Émise le ${invoice.issuedAt.toLocaleDateString("fr-CA")}`,
    )
    .text(`Statut : ${invoice.status}`);

  doc.moveDown(1);

  // ── Client ───────────────────────────────────────

  const customerName = invoice.customer
    ? `${invoice.customer.firstName ?? ""} ${
        invoice.customer.lastName ?? ""
      }`.trim() || invoice.customer.email || "Client"
    : "Client comptant";

  doc.fillColor("#000").fontSize(11).text("Facturé à :");
  doc.fontSize(10).fillColor("#333").text(customerName);

  if (invoice.customer?.email) {
    doc.text(invoice.customer.email);
  }

  if (invoice.customer?.phone) {
    doc.text(invoice.customer.phone);
  }

  doc.moveDown(1.5);

  // ── Lignes ───────────────────────────────────────

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

  for (const item of invoice.sale.items) {
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

  doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor("#ccc").stroke();

  y += 15;

  // ── Totaux ───────────────────────────────────────

  doc.fontSize(10).fillColor("#333");
  doc.text("Sous-total", 360, y, { width: 80, align: "right" });
  doc.text(formatMoney(invoice.subtotal), 450, y, {
    width: 95,
    align: "right",
  });

  y += 18;

  doc.text("Taxes", 360, y, { width: 80, align: "right" });
  doc.text(formatMoney(invoice.tax), 450, y, {
    width: 95,
    align: "right",
  });

  y += 22;

  doc.fontSize(12).fillColor("#000");
  doc.text("Total", 360, y, { width: 80, align: "right" });
  doc.text(formatMoney(invoice.total), 450, y, {
    width: 95,
    align: "right",
  });

  doc.moveDown(3);

  doc
    .fontSize(9)
    .fillColor("#999")
    .text("Merci de votre confiance.", 50, doc.y, {
      align: "center",
      width: 495,
    });

  doc.end();

  return { invoice, buffer: await done };
}

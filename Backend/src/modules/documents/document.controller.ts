import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import { listInvoicesQuerySchema } from "./document.schema.js";
import {
  getInvoices,
  getInvoiceById,
  generateInvoicePdf,
} from "./document.service.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

export async function getAllInvoices(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const query = listInvoicesQuerySchema.parse(req.query);

    const invoices = await getInvoices(
      auth.organizationId,
      query,
    );

    return res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      error: "Unable to fetch invoices",
    });
  }
}

export async function getOneInvoice(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const invoiceId = req.params.id;

    if (!invoiceId || Array.isArray(invoiceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid invoice ID",
      });
    }

    const invoice = await getInvoiceById(
      auth.organizationId,
      invoiceId,
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found",
      });
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch invoice",
    });
  }
}

export async function downloadInvoicePdf(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const invoiceId = req.params.id;

    if (!invoiceId || Array.isArray(invoiceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid invoice ID",
      });
    }

    const { invoice, buffer } = await generateInvoicePdf(
      auth.organizationId,
      invoiceId,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${invoice.number}.pdf"`,
    );

    return res.send(buffer);
  } catch (error) {
    console.error(error);

    if (
      error instanceof Error &&
      error.message === "INVOICE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        error: "Invoice not found",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Unable to generate invoice PDF",
    });
  }
}

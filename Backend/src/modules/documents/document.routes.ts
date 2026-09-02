// Backend/src/modules/documents/document.routes.ts

import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  getAllInvoices,
  getOneInvoice,
  downloadInvoicePdf,
} from "./document.controller.js";

import {
  createQuoteHandler,
  getAllQuotes,
  getOneQuote,
  updateQuoteStatusHandler,
  convertQuoteHandler,
  downloadQuotePdf,
} from "./quote.controller.js";

const router = Router();

router.use(requireAuth);

// ── Factures ─────────────────────────────────────

router.get(
  "/invoices",
  requirePermission("DOCUMENTS", "VIEW"),
  getAllInvoices,
);

router.get(
  "/invoices/:id",
  requirePermission("DOCUMENTS", "VIEW"),
  getOneInvoice,
);

router.get(
  "/invoices/:id/pdf",
  requirePermission("DOCUMENTS", "VIEW"),
  downloadInvoicePdf,
);

// ── Devis ────────────────────────────────────────

router.get(
  "/quotes",
  requirePermission("DOCUMENTS", "VIEW"),
  getAllQuotes,
);

router.get(
  "/quotes/:id",
  requirePermission("DOCUMENTS", "VIEW"),
  getOneQuote,
);

router.get(
  "/quotes/:id/pdf",
  requirePermission("DOCUMENTS", "VIEW"),
  downloadQuotePdf,
);

router.post(
  "/quotes",
  requirePermission("DOCUMENTS", "CREATE"),
  createQuoteHandler,
);

router.patch(
  "/quotes/:id/status",
  requirePermission("DOCUMENTS", "UPDATE"),
  updateQuoteStatusHandler,
);

router.post(
  "/quotes/:id/convert",
  requirePermission("DOCUMENTS", "UPDATE"),
  convertQuoteHandler,
);

export default router;
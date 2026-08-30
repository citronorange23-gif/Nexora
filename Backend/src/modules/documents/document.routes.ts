import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  getAllInvoices,
  getOneInvoice,
  downloadInvoicePdf,
} from "./document.controller.js";

const router = Router();

router.use(requireAuth);

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

export default router;

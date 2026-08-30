import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  create,
  getAll,
  getOne,
  cancel,
  refund,
  emailReceipt,
} from "./sale.controller.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission("SALES", "VIEW"),
  getAll,
);

router.get(
  "/:id",
  requirePermission("SALES", "VIEW"),
  getOne,
);

router.post(
  "/",
  requirePermission("SALES", "CREATE"),
  create,
);

router.post(
  "/:id/cancel",
  requirePermission("SALES", "UPDATE"),
  cancel,
);

router.post(
  "/:id/refund",
  requirePermission("SALES", "UPDATE"),
  refund,
);

router.post(
  "/:id/email",
  requirePermission("SALES", "VIEW"),
  emailReceipt,
);

export default router;  
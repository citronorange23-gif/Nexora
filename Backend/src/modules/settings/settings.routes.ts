import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  getSettings,
  updateReceiptEmailHandler,
} from "./settings.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("FINANCE", "VIEW"), getSettings);

router.patch(
  "/receipt-email",
  requirePermission("FINANCE", "UPDATE"),
  updateReceiptEmailHandler,
);

export default router;
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  create,
  getAll,
  getOne,
  cancel,
  refund,
} from "./sale.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermission("SALES", "VIEW"), getAll);

router.get("/:id", requirePermission("SALES", "VIEW"), getOne,);

router.post("/", requirePermission("SALES", "CREATE"), create,);

router.post("/:id/cancel", cancel);

router.post("/:id/refund", refund);

export default router;
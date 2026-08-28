import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  create,
  list,
  getOne,
  update,
  remove,
} from "./customer.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", requirePermission("CRM", "CREATE"), create);
router.get("/", requirePermission("CRM", "VIEW"), list);
router.get("/:id", requirePermission("CRM", "VIEW"), getOne);
router.patch("/:id", requirePermission("CRM", "UPDATE"), update);
router.delete("/:id", requirePermission("CRM", "DELETE"), remove);

export default router;

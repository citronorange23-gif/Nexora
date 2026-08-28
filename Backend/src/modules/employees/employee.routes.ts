import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  getAll,
  create,
  updateRole,
  remove,
} from "./employee.controller.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission("EMPLOYEES", "VIEW"),
  getAll,
);

router.post(
  "/",
  requirePermission("EMPLOYEES", "CREATE"),
  create,
);

router.patch(
  "/:id/role",
  requirePermission("EMPLOYEES", "UPDATE"),
  updateRole,
);

router.delete(
  "/:id",
  requirePermission("EMPLOYEES", "DELETE"),
  remove,
);

export default router;
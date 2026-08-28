import { Router } from "express";

import {
  getAll,
  getOne,
  create,
  update,
  remove,
} from "./role.controller.js";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";

import {
  ModuleKey,
  PermissionAction,
} from "../../generated/prisma/client.js";

const router = Router();

router.use(requireAuth);

// Voir les rôles
router.get(
  "/",
  requirePermission(
    ModuleKey.ROLES,
    PermissionAction.VIEW,
  ),
  getAll,
);

// Voir un rôle
router.get(
  "/:id",
  requirePermission(
    ModuleKey.ROLES,
    PermissionAction.VIEW,
  ),
  getOne,
);

// Créer un rôle
router.post(
  "/",
  requirePermission(
    ModuleKey.ROLES,
    PermissionAction.CREATE,
  ),
  create,
);

// Modifier un rôle
router.patch(
  "/:id",
  requirePermission(
    ModuleKey.ROLES,
    PermissionAction.UPDATE,
  ),
  update,
);

// Supprimer un rôle
router.delete(
  "/:id",
  requirePermission(
    ModuleKey.ROLES,
    PermissionAction.DELETE,
  ),
  remove,
);

export default router;
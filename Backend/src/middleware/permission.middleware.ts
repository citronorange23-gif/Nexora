import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { db } from "../lib/db.js";

import type { AuthenticatedRequest } from "./auth.middleware.js";

import type {
  ModuleKey,
  PermissionAction,
} from "../generated/prisma/client.js";

export function requirePermission(
  module: ModuleKey,
  action: PermissionAction,
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const auth = (req as AuthenticatedRequest).user;

      if (!auth) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const permission = await db.rolePermission.findFirst({
        where: {
          roleId: auth.roleId,
          module,
          action,
          role: {
            organizationId: auth.organizationId,
          },
        },
      });

      if (!permission) {
        return res.status(403).json({
          success: false,
          error: "Permission denied",
        });
      }

      next();
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: "Unable to verify permission",
      });
    }
  };
}
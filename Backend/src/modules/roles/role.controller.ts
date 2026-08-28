import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
} from "./role.service.js";

import {
  ModuleKey,
  PermissionAction,
} from "../../generated/prisma/client.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

function isValidModule(
  value: unknown,
): value is ModuleKey {
  return (
    typeof value === "string" &&
    Object.values(ModuleKey).includes(
      value as ModuleKey,
    )
  );
}

function isValidAction(
  value: unknown,
): value is PermissionAction {
  return (
    typeof value === "string" &&
    Object.values(PermissionAction).includes(
      value as PermissionAction,
    )
  );
}

function validatePermissions(
  permissions: unknown,
) {
  if (!Array.isArray(permissions)) {
    return false;
  }

  return permissions.every((permission) => {
    if (
      typeof permission !== "object" ||
      permission === null
    ) {
      return false;
    }

    const item =
      permission as Record<string, unknown>;

    if (!isValidModule(item.module)) {
      return false;
    }

    if (!Array.isArray(item.actions)) {
      return false;
    }

    return item.actions.every(isValidAction);
  });
}

export async function getAll(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const roles = await getRoles(
      auth.organizationId,
    );

    return res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch roles",
    });
  }
}

export async function getOne(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const roleId = req.params.id;

    if (
      !roleId ||
      Array.isArray(roleId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid role ID",
      });
    }

    const role = await getRole(
      auth.organizationId,
      roleId,
    );

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ROLE_NOT_FOUND"
    ) {
      return res.status(404).json({
        success: false,
        error: "Role not found",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch role",
    });
  }
}

export async function create(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const {
      name,
      description,
      permissions,
    } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Role name is required",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid description",
      });
    }

    if (
      !validatePermissions(permissions)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid permissions",
      });
    }

    const role = await createRole(
      auth.organizationId,
      {
        name: name.trim(),
        description:
          description?.trim(),
        permissions,
      },
    );

    return res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ROLE_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        success: false,
        error: "Role already exists",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to create role",
    });
  }
}

export async function update(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const roleId = req.params.id;

    if (
      !roleId ||
      Array.isArray(roleId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid role ID",
      });
    }

    const {
      name,
      description,
      permissions,
    } = req.body;

    if (
      name !== undefined &&
      (typeof name !== "string" ||
        !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid role name",
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid description",
      });
    }

    if (
      permissions !== undefined &&
      !validatePermissions(permissions)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid permissions",
      });
    }

    const role = await updateRole(
      auth.organizationId,
      roleId,
      {
        name:
          name !== undefined
            ? name.trim()
            : undefined,
        description:
          description !== undefined
            ? description.trim()
            : undefined,
        permissions,
      },
    );

    return res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "ROLE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      if (
        error.message ===
        "CANNOT_MODIFY_SYSTEM_ROLE"
      ) {
        return res.status(403).json({
          success: false,
          error:
            "System roles cannot be modified",
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to update role",
    });
  }
}

export async function remove(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);
    const roleId = req.params.id;

    if (
      !roleId ||
      Array.isArray(roleId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid role ID",
      });
    }

    await deleteRole(
      auth.organizationId,
      roleId,
    );

    return res.json({
      success: true,
      message: "Role deleted",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message ===
        "ROLE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      if (
        error.message ===
        "CANNOT_DELETE_SYSTEM_ROLE"
      ) {
        return res.status(403).json({
          success: false,
          error:
            "System roles cannot be deleted",
        });
      }

      if (
        error.message ===
        "ROLE_IN_USE"
      ) {
        return res.status(409).json({
          success: false,
          error:
            "Role is currently assigned to members",
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to delete role",
    });
  }
}

import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  createEmployee,
  getEmployees,
  removeEmployee,
  updateEmployeeRole,
} from "./employee.service.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

export async function getAll(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const employees = await getEmployees(
      auth.organizationId,
    );

    return res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch employees",
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
      email,
      password,
      firstName,
      lastName,
      roleId,
    } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Password must contain at least 8 characters",
      });
    }

    if (
      roleId !== undefined &&
      typeof roleId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid role ID",
      });
    }

    if (
      firstName !== undefined &&
      typeof firstName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid first name",
      });
    }

    if (
      lastName !== undefined &&
      typeof lastName !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid last name",
      });
    }

    if (!roleId) {
      return res.status(400).json({
        success: false,
        error: "Role is required",
      });
    }

    const employee = await createEmployee(
      auth.organizationId,
      {
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        roleId,
      },
    );

    return res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (
        error.message === "EMAIL_ALREADY_EXISTS"
      ) {
        return res.status(409).json({
          success: false,
          error: "Email already exists",
        });
      }

      if (
        error.message === "ROLE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      if (
        error.message === "CANNOT_CREATE_OWNER"
      ) {
        return res.status(403).json({
          success: false,
          error: "Cannot create an OWNER",
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Unable to create employee",
    });
  }
}

export async function updateRole(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const memberId = req.params.id;

    if (
      !memberId ||
      Array.isArray(memberId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid employee ID",
      });
    }

    const { roleId } = req.body;

    if (
      typeof roleId !== "string" ||
      !roleId
    ) {
      return res.status(400).json({
        success: false,
        error: "Role ID is required",
      });
    }

    const employee =
      await updateEmployeeRole(
        auth.organizationId,
        memberId,
        roleId,
      );

    return res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (
        error.message ===
        "EMPLOYEE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          error: "Employee not found",
        });
      }

      if (
        error.message ===
        "CANNOT_MODIFY_OWNER"
      ) {
        return res.status(403).json({
          success: false,
          error: "Cannot modify OWNER",
        });
      }

      if (
        error.message === "ROLE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          error: "Role not found",
        });
      }

      if (
        error.message ===
        "CANNOT_ASSIGN_OWNER"
      ) {
        return res.status(403).json({
          success: false,
          error: "Cannot assign OWNER role",
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Unable to update employee",
    });
  }
}

export async function remove(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const memberId = req.params.id;

    if (
      !memberId ||
      Array.isArray(memberId)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid employee ID",
      });
    }

    await removeEmployee(
      auth.organizationId,
      memberId,
    );

    return res.json({
      success: true,
      message: "Employee removed",
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      if (
        error.message ===
        "EMPLOYEE_NOT_FOUND"
      ) {
        return res.status(404).json({
          success: false,
          error: "Employee not found",
        });
      }

      if (
        error.message ===
        "CANNOT_DELETE_OWNER"
      ) {
        return res.status(403).json({
          success: false,
          error: "Cannot delete OWNER",
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: "Unable to remove employee",
    });
  }
}
import type { Request, Response } from "express";

import { registerSchema, loginSchema } from "./auth.schema.js";
import { registerUser, loginUser } from "./auth.service.js";;

export async function register(
  req: Request,
  res: Response,
) {
  try {
    const input = registerSchema.parse(req.body);

    const result = await registerUser(input);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(409).json({
          success: false,
          error: "Email already exists",
        });
      }

      if (error.message === "MODULE_CONFIGURATION_INCOMPLETE") {
        return res.status(500).json({
          success: false,
          error: "Business modules are not configured correctly",
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: "Invalid registration data",
    });
  }
}

export async function login(
  req: Request,
  res: Response,
) {
  try {
    const input = loginSchema.parse(req.body);

    const result = await loginUser(input);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password",
        });
      }

      if (error.message === "NO_ORGANIZATION") {
        return res.status(403).json({
          success: false,
          error: "User has no organization",
        });
      }

      if (error.message === "JWT_SECRET_NOT_CONFIGURED") {
        return res.status(500).json({
          success: false,
          error: "Authentication is not configured",
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: "Invalid login data",
    });
  }
}
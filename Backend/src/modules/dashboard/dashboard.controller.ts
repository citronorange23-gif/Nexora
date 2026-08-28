import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import { getDashboardOverview } from "./dashboard.service.js";

export async function overview(
  req: Request,
  res: Response,
) {
  try {
    const auth =
      (req as AuthenticatedRequest).user;

    const data =
      await getDashboardOverview(
        auth.organizationId,
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to load dashboard",
    });
  }
}
import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  getBusinessSettings,
  updateReceiptEmail,
} from "./settings.service.js";

function getAuth(req: Request) {
  return (req as AuthenticatedRequest).user;
}

export async function getSettings(req: Request, res: Response) {
  try {
    const auth = getAuth(req);

    const business = await getBusinessSettings(auth.organizationId);

    return res.json({ success: true, data: business });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to fetch settings",
    });
  }
}

export async function updateReceiptEmailHandler(
  req: Request,
  res: Response,
) {
  try {
    const auth = getAuth(req);

    const receiptEmail = req.body?.receiptEmail;

    if (!receiptEmail || typeof receiptEmail !== "string") {
      return res.status(400).json({
        success: false,
        error: "Email required",
      });
    }

    const business = await updateReceiptEmail(
      auth.organizationId,
      receiptEmail,
    );

    return res.json({ success: true, data: business });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Unable to update settings",
    });
  }
}
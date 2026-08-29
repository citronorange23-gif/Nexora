// backend/.../payment.routes.ts (complet)

import { Router } from "express";
import type { RequestHandler } from "express";
import express from "express";
import {
  createConnectOnboarding,
  getConnectStatus,
  createPayment,
  stripeWebhook,
} from "./payment.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook as unknown as RequestHandler,
);

router.post(
  "/connect",
  requireAuth,
  createConnectOnboarding as unknown as RequestHandler,
);

router.post(
  "/create-intent",
  requireAuth,
  createPayment as unknown as RequestHandler,
);

router.get(
  "/connect/status",
  requireAuth,
  getConnectStatus as unknown as RequestHandler,
);

export default router;
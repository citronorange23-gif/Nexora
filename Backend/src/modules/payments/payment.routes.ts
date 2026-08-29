import { Router } from "express";
import type { RequestHandler } from "express";
import {
  createConnectOnboarding,
  getConnectStatus,
  createPayment,
} from "./payment.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

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
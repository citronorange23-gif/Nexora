import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/me", requireAuth, (req, res) => {
  const authReq = req as AuthenticatedRequest;

  return res.json({
    success: true,
    data: {
      userId: authReq.user.userId,
      organizationId: authReq.user.organizationId,
      role: authReq.user.role,
    },
  });
});

export default router;
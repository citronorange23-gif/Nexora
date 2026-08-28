import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";

import { overview } from "./dashboard.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", overview);

export default router;
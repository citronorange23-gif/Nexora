import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";

import {
  add,
  remove,
  adjust,
  list,
  movements,
} from "./inventory.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", list);

router.post("/:productId/add", add);

router.post("/:productId/remove", remove);

router.post("/:productId/adjust", adjust);

router.get("/:productId/movements", movements);

export default router;
import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";

import {
  create,
  list,
  getOne,
  update,
  remove,
  lookupProduct
} from "./product.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", create);

router.get("/", list);

router.get("/lookup", lookupProduct);

router.get("/:id", getOne);

router.patch("/:id", update);

router.delete("/:id", remove);

export default router;
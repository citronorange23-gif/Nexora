import { Router } from "express";
import express from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import {
  downloadDocument,
  getAllDocuments,
  getOneDocument,
  removeDocument,
  uploadDocument,
} from "./document.controller.js";
import { MAX_DOCUMENT_SIZE } from "./document.storage.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission("DOCUMENTS", "VIEW"),
  getAllDocuments,
);

router.get(
  "/:id",
  requirePermission("DOCUMENTS", "VIEW"),
  getOneDocument,
);

router.get(
  "/:id/file",
  requirePermission("DOCUMENTS", "VIEW"),
  downloadDocument,
);

router.post(
  "/",
  requirePermission("DOCUMENTS", "CREATE"),
  express.raw({
    type: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ],
    limit: MAX_DOCUMENT_SIZE,
  }),
  uploadDocument,
);

router.delete(
  "/:id",
  requirePermission("DOCUMENTS", "DELETE"),
  removeDocument,
);

export default router;

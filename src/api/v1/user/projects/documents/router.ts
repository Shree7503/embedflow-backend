import express from "express";
import {
  uploadDocument,
  getDocument,
  deleteDocument,
  changeDocument,
  getDocumentById,
  updateDocumentStatus,
} from "@/api/v1/user/projects/documents/controller";

const router = express.Router({ mergeParams: true });

router.post("/", uploadDocument);
router.get("/", getDocument);
router.put("/", changeDocument);
router.delete("/:documentId", deleteDocument);
router.get("/:documentId", getDocumentById);
router.patch("/:documentId", updateDocumentStatus);

export default router;

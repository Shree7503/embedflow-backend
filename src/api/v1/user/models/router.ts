import express from "express";
import {
  createModels,
  deleteModel,
  getModels,
  updateModel,
} from "@/api/v1/user/models/controller";

const router = express.Router();

router.post("/", createModels);
router.get("/", getModels);
router.put("/:id", updateModel);
router.delete("/:id", deleteModel);

export default router;

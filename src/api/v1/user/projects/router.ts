import express from "express";
import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} from "@/api/v1/user/projects/controller";

const router = express.Router();

router.post("/", createProject);
router.get("/", getProjects);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;

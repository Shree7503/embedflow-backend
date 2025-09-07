import express from "express";
import {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} from "@/api/v1/user/projects/controller";

const router = express.Router();

router.post("/create", createProject);
router.get("/get", getProjects);
router.put("/update/:id", updateProject);
router.delete("/delete/:id", deleteProject);

export default router;

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
router.put("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);



export default router;

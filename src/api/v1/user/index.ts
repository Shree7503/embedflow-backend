import express from "express";
import authentication from "@/api/v1/user/authentication";
import projects from "@/api/v1/user/projects";
import models from "@/api/v1/user/models"
import logs from "@/api/v1/user/logs-llm"
import { verifyUserToken } from "@/middlewares/user.auth.middleware";

const router = express.Router();

router.use("/auth", authentication);
router.use("/projects", verifyUserToken, projects);
router.patch("/models",verifyUserToken,models)
router.use("logs",verifyUserToken,logs)

export default router;

import express from "express";
import authentication from "@/api/v1/user/authentication";
import projects from "@/api/v1/user/projects";
import { verifyUserToken } from "@/middlewares/user.auth.middleware";

const router = express.Router();

router.use("/auth", authentication);
router.use("/projects", verifyUserToken, projects);

export default router;

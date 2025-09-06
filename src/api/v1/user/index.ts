import express from "express";
import authentication from "@/api/v1/user/authentication";

const router = express.Router();

router.use("/auth", authentication);

export default router;

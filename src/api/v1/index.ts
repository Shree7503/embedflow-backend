import express from "express";
import user from "@/api/v1/user";

const router = express.Router();

router.use("/user", user);

export default router;

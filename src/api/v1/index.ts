import express from "express";
import auth from "@/api/v1/authentication";

const router = express.Router();

router.use("/auth", auth);

export default router;

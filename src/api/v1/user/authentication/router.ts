import express from "express";
import {
  signIn,
  signOut,
  getUser,
  updateUser,
  signUp,
} from "@/api/v1/user/authentication/controller";

const router = express.Router();

router.post("/sign-in", signIn);
router.post("/sign-up", signUp);
router.post("/sign-out", signOut);

//auth middleware
// app.use(verifyUser);

router.get("/get-user", getUser);
router.put("/update-user", updateUser);

export default router;

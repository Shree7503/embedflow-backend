import express from "express";
import { logIn, logOut, signUp, updateUser, getUser } from "./controller";

const router = express.Router();

const app = express();

router.post("/login", logIn);
router.post("/register", signUp);
router.post("/sign-out", logOut);

//auth middleware
// app.use(verifyUser);

router.get("/get-user", getUser);
router.put("/update-user", updateUser);

export default router;

import express from "express";
import { logIn, logOut, signUp, updateUser, getUser } from "./controller";

const router = express.Router();


const app = express();

router.post("/login", logIn);
router.post("/register", signUp);
router.post("/logOut", logOut);

//auth middleware
// app.use(verifyUser);

router.get("/me", getUser);
router.put("/me", updateUser);

export default router;

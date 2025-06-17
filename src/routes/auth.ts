import express from "express";
import {
  getUser,
  login,
  logout,
  register
} from "../controllers/Auth";
import { checkAuth } from "../middleware/checkAuth";

const router = express.Router();

router.post("/register", register);
// router.post("/verify", otpVerification);
// router.post("/resend", resentOtp);
router.post("/login", login);
router.get("/logout", checkAuth, logout);
router.get("/user", checkAuth, getUser);

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Auth_1 = require("../controllers/Auth");
const checkAuth_1 = require("../middleware/checkAuth");
const router = express_1.default.Router();
router.post("/register", Auth_1.register);
// router.post("/verify", otpVerification);
// router.post("/resend", resentOtp);
router.post("/login", Auth_1.login);
router.get("/logout", checkAuth_1.checkAuth, Auth_1.logout);
router.get("/user", checkAuth_1.checkAuth, Auth_1.getUser);
exports.default = router;

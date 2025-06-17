"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVerified = exports.checkAuth = void 0;
const error_1 = require("./error");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = require("../models/userModel");
const checkAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let token;
    // Check for token in cookies
    if (req.cookies.token) {
        token = req.cookies.token;
    }
    // Check for token in Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token)
        return next(new error_1.CustomError("Login First", 401));
    const secret = process.env.JWT_SECRET;
    if (!secret)
        return next(new error_1.CustomError("Jwt Secret not defined", 400));
    const decoded = jsonwebtoken_1.default.verify(token, secret);
    req.user = yield userModel_1.User.findById(decoded.id);
    next();
});
exports.checkAuth = checkAuth;
const isVerified = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.user.status !== "Verified")
        return next(new error_1.CustomError("Your are not verified", 400));
    next();
});
exports.isVerified = isVerified;

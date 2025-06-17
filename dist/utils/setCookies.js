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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_1 = require("../middleware/error");
const setCookie = (_a) => __awaiter(void 0, [_a], void 0, function* ({ user, res, next, message, statusCode }) {
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret)
            return next(new error_1.CustomError("Jwt Secret not defined"));
        const token = jsonwebtoken_1.default.sign({ id: user._id }, secret);
        res
            .status(statusCode)
            .cookie("token", token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "none",
            secure: true,
        })
            .json({
            success: true,
            message,
            token,
            user
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
});
exports.default = setCookie;

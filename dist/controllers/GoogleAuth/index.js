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
exports.googleAuth = void 0;
const axios_1 = __importDefault(require("axios"));
const error_1 = require("../../middleware/error");
const userModel_1 = require("../../models/userModel");
const setCookies_1 = __importDefault(require("../../utils/setCookies"));
const googleAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { access_token } = req.body;
        if (!access_token)
            return next(new error_1.CustomError("No access token provided", 400));
        // Verify the access token with Google
        const tokenInfoResponse = yield axios_1.default.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`);
        const userInfoResponse = yield axios_1.default.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`);
        const tokenInfo = tokenInfoResponse.data;
        const userData = userInfoResponse.data;
        if (!tokenInfo || !userData)
            return next(new error_1.CustomError("Invalid token", 401));
        const { email, name } = userData;
        if (!email)
            return next(new error_1.CustomError("Email not found", 404));
        const nameArray = name.split(" ");
        const user = yield userModel_1.User.findOne({ email });
        if (user) {
            // If user already exists then log in the user
            (0, setCookies_1.default)({
                user,
                res,
                next,
                message: "Login Success",
                statusCode: 200,
            });
        }
        else {
            // If user not found then create a new user
            const newUser = yield userModel_1.User.create({
                firstname: nameArray[0],
                lastname: nameArray.length > 1 ? nameArray[1] : null,
                email,
            });
            (0, setCookies_1.default)({
                user: newUser,
                res,
                next,
                message: "Registered successfully",
                statusCode: 201,
            });
        }
    }
    catch (error) {
        console.error(error);
        next(new error_1.CustomError("Authentication failed", 500));
    }
});
exports.googleAuth = googleAuth;

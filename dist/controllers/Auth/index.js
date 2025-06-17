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
exports.getUser = exports.logout = exports.login = exports.register = void 0;
const userModel_1 = require("../../models/userModel");
const error_1 = require("../../middleware/error");
const setCookies_1 = __importDefault(require("../../utils/setCookies"));
// Remove hashPassword function as it's no longer needed
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        // Check if user already exists
        const existingUser = yield userModel_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Create new user
        // Bcrypt hashing is now handled in the userModel pre-save hook
        const firstname = name.split(" ")[0];
        const lastname = name.split(" ")[1];
        const newUser = new userModel_1.User({
            firstname,
            lastname,
            email,
            password, // Pass plain password, pre-save hook will hash it
        });
        yield newUser.save();
        (0, setCookies_1.default)({
            user: newUser,
            res,
            next,
            message: "Login Success",
            statusCode: 200,
        });
        res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
});
exports.register = register;
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Find user by email
        const user = yield userModel_1.User.findOne({ email }).select('+password'); // Only select password, salt is not needed
        if (!user) {
            console.log("User not found");
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        // Compare password using bcrypt
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            console.log("Invalid password");
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        (0, setCookies_1.default)({
            user,
            res,
            next,
            message: "Login Success",
            statusCode: 200,
        });
        res.status(200).json({ message: 'Logged in successfully' });
    }
    catch (error) {
        console.log(error);
        next(new error_1.CustomError(error.message));
    }
});
exports.login = login;
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res
        .status(200)
        .cookie("token", null, {
        expires: new Date(Date.now()),
    })
        .json({
        success: true,
        message: "Logged out",
    });
});
exports.logout = logout;
const getUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield userModel_1.User.findById(req.user._id);
        if (!user)
            return next(new error_1.CustomError("User not found", 400));
        res.status(200).json({
            success: true,
            user
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message));
    }
});
exports.getUser = getUser;

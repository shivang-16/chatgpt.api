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
exports.assignUserToTask = exports.assignUserToProject = exports.getUsersByProjectId = exports.getAllUsers = void 0;
const error_1 = require("../../middleware/error");
const userModel_1 = require("../../models/userModel");
const projectModel_1 = __importDefault(require("../../models/projectModel"));
const taskModel_1 = __importDefault(require("../../models/taskModel"));
const getAllUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield userModel_1.User.find({});
        res.status(200).json({
            success: true,
            users,
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message, 400));
    }
});
exports.getAllUsers = getAllUsers;
const getUsersByProjectId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectId } = req.params;
        // Find users where the projectId is present in their 'projects' array
        const users = yield userModel_1.User.find({ projects: projectId });
        if (!users || users.length === 0) {
            return next(new error_1.CustomError('No users found for this project', 404));
        }
        res.status(200).json({
            success: true,
            users,
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message, 400));
    }
});
exports.getUsersByProjectId = getUsersByProjectId;
const assignUserToProject = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, projectId } = req.body;
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            console.log("user not found");
            return next(new error_1.CustomError('User not found', 404));
        }
        const project = yield projectModel_1.default.findById(projectId);
        if (!project) {
            console.log("project not found");
            return next(new error_1.CustomError('Project not found', 404));
        }
        // Add user to project's members if not already present
        if (!project.members.includes(userId)) {
            project.members.push(userId);
            yield project.save();
        }
        // Add project to user's projects if not already present
        if (!user.projects.includes(projectId)) {
            user.projects.push(projectId);
            yield user.save();
        }
        res.status(200).json({
            success: true,
            message: 'User assigned to project successfully',
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message, 400));
    }
});
exports.assignUserToProject = assignUserToProject;
const assignUserToTask = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { taskId, userId } = req.body;
        console.log(req.body, "here is body arequst");
        const user = yield userModel_1.User.findById(userId);
        if (!user) {
            return next(new error_1.CustomError('User not found', 404));
        }
        console.log(user);
        const task = yield taskModel_1.default.findById(taskId);
        if (!task) {
            return next(new error_1.CustomError('Task not found', 404));
        }
        // Assign user to task
        task.assignedTo = userId;
        yield task.save();
        res.status(200).json({
            success: true,
            message: 'User assigned to task successfully',
        });
    }
    catch (error) {
        next(new error_1.CustomError(error.message, 400));
    }
});
exports.assignUserToTask = assignUserToTask;

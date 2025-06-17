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
exports.deleteProject = exports.updateProject = exports.getProjectById = exports.getProjects = exports.createProject = void 0;
const projectModel_1 = __importDefault(require("../../models/projectModel"));
const error_1 = require("../../middleware/error");
const userModel_1 = require("../../models/userModel"); // Import the User model
const taskModel_1 = __importDefault(require("../../models/taskModel"));
const createProject = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description } = req.body;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const project = yield projectModel_1.default.create({
            name,
            description,
            owner,
        });
        // Add the project to the user's projects array
        yield userModel_1.User.findByIdAndUpdate(owner, { $push: { projects: project._id } }, { new: true, useFindAndModify: false });
        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            project,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.createProject = createProject;
const getProjects = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const projects = yield projectModel_1.default.find({ owner });
        res.status(200).json({
            success: true,
            projects,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getProjects = getProjects;
const getProjectById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const project = yield projectModel_1.default.findOne({ _id: id, owner });
        if (!project) {
            return next(new error_1.CustomError('Project not found', 404));
        }
        res.status(200).json({
            success: true,
            project,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getProjectById = getProjectById;
const updateProject = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, description, statuses } = req.body;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const updateFields = {};
        if (name)
            updateFields.name = name;
        if (description)
            updateFields.description = description;
        if (statuses)
            updateFields.statuses = statuses;
        const project = yield projectModel_1.default.findOneAndUpdate({ _id: id, owner }, updateFields, { new: true, runValidators: true });
        if (!project) {
            return next(new error_1.CustomError('Project not found or you do not have permission to update', 404));
        }
        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            project,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.updateProject = updateProject;
const deleteProject = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        // Check if there are any tasks assigned to this project
        const tasksCount = yield taskModel_1.default.countDocuments({ project: id });
        if (tasksCount > 0) {
            return next(new error_1.CustomError('Cannot delete project: It has assigned tasks.', 400));
        }
        const project = yield projectModel_1.default.findOneAndDelete({ _id: id, owner });
        if (!project) {
            return next(new error_1.CustomError('Project not found or you do not have permission to delete', 404));
        }
        // Remove the project from all users' projects array
        yield userModel_1.User.updateMany({ projects: id }, { $pull: { projects: id } });
        res.status(200).json({
            success: true,
            message: 'Project deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteProject = deleteProject;

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
exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasksByProjectId = exports.getTasks = exports.createTask = void 0;
const taskModel_1 = __importDefault(require("../../models/taskModel"));
const projectModel_1 = __importDefault(require("../../models/projectModel"));
const error_1 = require("../../middleware/error");
const createTask = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, projectId, assignedTo, status = 'todo', dueDate, priority } = req.body;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const project = yield projectModel_1.default.findById(projectId);
        if (!project) {
            return next(new error_1.CustomError('Project not found', 404));
        }
        if (project.owner.toString() !== owner.toString()) {
            return next(new error_1.CustomError('You are not authorized to create tasks in this project', 403));
        }
        const task = yield taskModel_1.default.create({
            name,
            description,
            project: projectId,
            assignedTo,
            status,
            dueDate,
            priority,
            createdBy: owner,
        });
        // Update project analytics based on initial status
        const updateQuery = {
            $inc: {}
        };
        if (status === 'todo') {
            updateQuery.$inc['analytics.todoTask'] = 1;
        }
        else if (status === 'in-progress') {
            updateQuery.$inc['analytics.inProgressTasks'] = 1;
        }
        else if (status === 'done') {
            updateQuery.$inc['analytics.completedTasks'] = 1;
        }
        yield projectModel_1.default.findByIdAndUpdate(projectId, updateQuery);
        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            task,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.createTask = createTask;
const getTasks = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const tasks = yield taskModel_1.default.find({}).populate({
            path: 'project',
            match: { owner: owner } // Only return tasks for projects owned by the user
        });
        // Filter out tasks where the project match failed (i.e., project is not owned by the user)
        const userTasks = tasks.filter(task => task.project !== null);
        res.status(200).json({
            success: true,
            tasks: userTasks,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getTasks = getTasks;
const getTasksByProjectId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { projectId } = req.params;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        console.log(owner, projectId, "here is the user");
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const project = yield projectModel_1.default.findById(projectId);
        if (!project || project.owner.toString() !== owner.toString()) {
            return next(new error_1.CustomError('Project not found or unauthorized', 404));
        }
        const tasks = yield taskModel_1.default.find({ project: projectId })
            .populate({
            path: 'createdBy',
            select: 'firstname lastname email' // Populate only name and email
        })
            .populate({
            path: 'assignedTo',
            select: 'firstname lastname email' // Populate only name and email
        });
        res.status(200).json({
            success: true,
            tasks,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getTasksByProjectId = getTasksByProjectId;
const getTaskById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const task = yield taskModel_1.default.findById(id).populate({
            path: 'project',
            match: { owner: owner }
        });
        if (!task || !task.project) {
            return next(new error_1.CustomError('Task not found or you do not have permission to view', 404));
        }
        res.status(200).json({
            success: true,
            task,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getTaskById = getTaskById;
const updateTask = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, description, assignedTo, status, dueDate, priority } = req.body;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const task = yield taskModel_1.default.findById(id).populate({
            path: 'project',
            match: { owner: owner }
        });
        if (!task || !task.project) {
            return next(new error_1.CustomError('Task not found or you do not have permission to update', 404));
        }
        const oldStatus = task.status;
        const updatedTask = yield taskModel_1.default.findOneAndUpdate({ _id: id }, { name, description, assignedTo, status, dueDate, priority }, { new: true, runValidators: true });
        // Update project analytics if status changed
        if (oldStatus !== status) {
            const updateQuery = {
                $inc: {}
            };
            // Decrement old status counter
            if (oldStatus === 'todo') {
                updateQuery.$inc['analytics.todoTask'] = -1;
            }
            else if (oldStatus === 'in-progress') {
                updateQuery.$inc['analytics.inProgressTasks'] = -1;
            }
            else if (oldStatus === 'done') {
                updateQuery.$inc['analytics.completedTasks'] = -1;
            }
            // Increment new status counter
            if (status === 'todo') {
                updateQuery.$inc['analytics.todoTask'] = (updateQuery.$inc['analytics.todoTask'] || 0) + 1;
            }
            else if (status === 'in-progress') {
                updateQuery.$inc['analytics.inProgressTasks'] = (updateQuery.$inc['analytics.inProgressTasks'] || 0) + 1;
            }
            else if (status === 'done') {
                updateQuery.$inc['analytics.completedTasks'] = (updateQuery.$inc['analytics.completedTasks'] || 0) + 1;
            }
            yield projectModel_1.default.findByIdAndUpdate(task.project._id, updateQuery);
        }
        res.status(200).json({
            success: true,
            message: "Task Updated",
            task: updatedTask,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.updateTask = updateTask;
const deleteTask = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const owner = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!owner) {
            return next(new error_1.CustomError('User not authenticated', 401));
        }
        const task = yield taskModel_1.default.findById(id).populate({
            path: 'project',
            match: { owner: owner }
        });
        if (!task || !task.project) {
            return next(new error_1.CustomError('Task not found or you do not have permission to delete', 404));
        }
        yield taskModel_1.default.deleteOne({ _id: id });
        res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
exports.deleteTask = deleteTask;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Task_1 = require("../controllers/Task");
const checkAuth_1 = require("../middleware/checkAuth");
const router = express_1.default.Router();
router.route('/').post(checkAuth_1.checkAuth, Task_1.createTask).get(checkAuth_1.checkAuth, Task_1.getTasks);
router.route('/:id').get(checkAuth_1.checkAuth, Task_1.getTaskById).put(checkAuth_1.checkAuth, Task_1.updateTask).delete(checkAuth_1.checkAuth, Task_1.deleteTask);
router.get('/project/:projectId', checkAuth_1.checkAuth, Task_1.getTasksByProjectId);
exports.default = router;

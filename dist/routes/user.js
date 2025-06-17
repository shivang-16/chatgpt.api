"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../controllers/User");
const checkAuth_1 = require("../middleware/checkAuth");
const router = express_1.default.Router();
router.route('/').get(checkAuth_1.checkAuth, User_1.getAllUsers);
router.route('/project/:projectId').get(checkAuth_1.checkAuth, User_1.getUsersByProjectId);
router.route('/assign/task').post(checkAuth_1.checkAuth, User_1.assignUserToTask);
router.route('/assign/project').post(checkAuth_1.checkAuth, User_1.assignUserToProject);
exports.default = router;

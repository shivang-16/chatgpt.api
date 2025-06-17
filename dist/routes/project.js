"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Project_1 = require("../controllers/Project");
const checkAuth_1 = require("../middleware/checkAuth");
const router = express_1.default.Router();
router.route('/').post(checkAuth_1.checkAuth, Project_1.createProject).get(checkAuth_1.checkAuth, Project_1.getProjects);
router.route('/:id').get(checkAuth_1.checkAuth, Project_1.getProjectById).put(checkAuth_1.checkAuth, Project_1.updateProject).delete(checkAuth_1.checkAuth, Project_1.deleteProject);
exports.default = router;

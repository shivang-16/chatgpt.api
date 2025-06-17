"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProjectSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    tasks: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Task' }],
    members: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    analytics: {
        todoTask: { type: Number, default: 0 },
        completedTasks: { type: Number, default: 0 },
        inProgressTasks: { type: Number, default: 0 },
    },
    statuses: [{
            label: { type: String, required: true },
            value: { type: Number, required: true },
        }],
}, {
    timestamps: true,
});
// Add a pre-save hook to set default statuses if the array is empty
ProjectSchema.pre('save', function (next) {
    if (this.isNew && (!Array.isArray(this.statuses) || this.statuses.length === 0)) {
        this.statuses = [
            { label: 'todo', value: 0 },
            { label: 'in-progress', value: 1 },
            { label: 'done', value: 2 },
        ];
    }
    next();
});
const Project = mongoose_1.default.model('Project', ProjectSchema);
exports.default = Project;

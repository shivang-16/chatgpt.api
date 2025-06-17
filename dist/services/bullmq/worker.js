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
exports.otpWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = require("dotenv");
const sendMail_1 = require("../../utils/sendMail");
(0, dotenv_1.config)();
const redisUri = process.env.REDIS_URI;
const connection = new ioredis_1.default(redisUri, { maxRetriesPerRequest: null });
exports.otpWorker = new bullmq_1.Worker("otp-queue", (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield (0, sendMail_1.sendMail)((_a = job.data) === null || _a === void 0 ? void 0 : _a.options);
}), { connection });

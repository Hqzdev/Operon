"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config({ path: ".env" });
dotenv_1.default.config({ path: ".env.local", override: true });
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(16),
    OPENAI_API_KEY: zod_1.z.string().optional(),
    OPENAI_MODEL: zod_1.z.string().default("gpt-4o-2024-08-06"),
    PORT: zod_1.z.coerce.number().default(4000),
    NEXT_PUBLIC_APP_URL: zod_1.z.string().default("http://localhost:3000"),
    NEXT_PUBLIC_API_BASE_URL: zod_1.z.string().default("http://localhost:4000/api"),
    YOOKASSA_SHOP_ID: zod_1.z.string().optional(),
    YOOKASSA_SECRET_KEY: zod_1.z.string().optional(),
    YOOKASSA_RETURN_URL: zod_1.z.string().default("http://localhost:3000/dashboard"),
    YOOKASSA_WEBHOOK_SECRET: zod_1.z.string().optional(),
});
exports.env = envSchema.parse(process.env);

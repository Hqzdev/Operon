"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const authController_1 = require("../controllers/authController");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
exports.authRoutes = router;
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
    name: zod_1.z.string().min(2).max(120).optional(),
    storeName: zod_1.z.string().min(2).max(120).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
});
router.post("/register", (0, validate_1.validateBody)(registerSchema), authController_1.registerController);
router.post("/login", (0, validate_1.validateBody)(loginSchema), authController_1.loginController);

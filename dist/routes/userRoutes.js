"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authenticate_1 = require("../middleware/authenticate");
const router = (0, express_1.Router)();
exports.userRoutes = router;
router.get("/me", authenticate_1.authenticate, userController_1.profileController);

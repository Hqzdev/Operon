import { Router } from "express";
import { z } from "zod";
import { loginController, registerController } from "../controllers/authController";
import { validateBody } from "../middleware/validate";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(120).optional(),
  storeName: z.string().min(2).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post("/register", validateBody(registerSchema), registerController);
router.post("/login", validateBody(loginSchema), loginController);

export { router as authRoutes };

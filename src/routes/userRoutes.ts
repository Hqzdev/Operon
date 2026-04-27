import { Router } from "express";
import {
  profileController,
  updateProfileController,
  changePasswordController,
  deleteAccountController,
} from "../controllers/userController";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/me", authenticate, profileController);
router.patch("/me", authenticate, updateProfileController);
router.patch("/me/password", authenticate, changePasswordController);
router.delete("/me", authenticate, deleteAccountController);

export { router as userRoutes };

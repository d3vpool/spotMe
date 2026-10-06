import express from "express";
import { logInController, signUpController } from "../controllers/user.controllers.js";
import {
  userLogInSchema,
  userSignUpSchema,
  validateInput,
} from "../middlewares/inputValidation.js";
import { authCheck } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello Hello");
});

router.post("/signup", authLimiter, validateInput(userSignUpSchema), signUpController);

router.post("/login", authLimiter, validateInput(userLogInSchema), logInController);

export default router;

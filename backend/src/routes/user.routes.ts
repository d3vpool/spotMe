import express from "express";
import { logInController, signUpController } from "../controllers/user.controllers.js";
import { userLogInSchema, userSignUpSchema, validateInput } from "../middlewares/inputValidation.js";
import { authCheck } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/", (req, res) => {
    res.send("Hello Hello");
})

router.post("/signUp", validateInput(userSignUpSchema), signUpController);


router.post("/logIn", validateInput(userLogInSchema), logInController);

export default router;
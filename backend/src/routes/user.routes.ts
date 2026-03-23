import express from "express";
import { signUpController } from "../controllers/user.controllers.js";
import { validateInput } from "../middlewares/inputValidation.js";

const router = express.Router();


router.get("/", (req, res) => {
    res.send("Hello Hello");
})

router.post("/signUp", validateInput, signUpController);


export default router;
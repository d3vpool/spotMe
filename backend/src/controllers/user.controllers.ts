import type { Request, Response } from "express";
import { prisma } from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

console.log("Hi");
console.log("SECRET KEY: "+process.env.JWT_SECRET);

export async function signUpController(req: Request, res: Response) {
    const email = req.body.email;
    const firstName = req.body.firstName;
    const password = req.body.password;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email: email,
                firstName: firstName,
                password: hashedPassword
            }
        })

        const token = jwt.sign(
            { id: user.id}, 
            process.env.JWT_SECRET!
        );


        
        res.json({
            message: "User Created Successfully",
            token: token
        });
    } catch(err) {
        res.status(500).json({ message: "SignUp failed" });
    }
}


export async function logInController(req: Request, res: Response) {
    const body = req.body;

    const email = body.email;
    const password = body.password;

    const user = await prisma.user.findUnique({
        where: {
            email: email
        }
    })

    if(!user){
        return res.status(401).json({
            message: "Invalid email or password"
        })
    }

    const hashedPassword = user.password;

    const match = await bcrypt.compare(password, hashedPassword);

    if(match){
        const token = jwt.sign({
            id: user.id
        }, process.env.JWT_SECRET!)

        return res.status(200).json({
            message: "Logged In Successfully",
            token: token
        })
    } else{
        return res.status(401).json({
            message: "Invalid email or password"
        })
    }


}
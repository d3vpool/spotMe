import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

export const userSignUpSchema = z.object({
    email: z.email(),
    firstName: z.string(),
    password: z.string().min(6)
});

export const userLogInSchema = z.object({
    email: z.email(),
    password: z.string().min(6)
})

export function validateInput(schema: z.ZodSchema){
    return ( 
        req: Request, 
        res: Response, 
        next: NextFunction) => {

        const body = req.body;
        const response = schema.safeParse(body);

        if(!response.success) {
            return res.status(400).json({
                error: response.error
            });
        }

        req.body = response.data;
        next();
    }
}

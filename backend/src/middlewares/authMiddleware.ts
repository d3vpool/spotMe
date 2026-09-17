import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";



export async function authCheck(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) {
        return sendError(res, 401, "Token Missing");
    }

    jwt.verify(token, env.JWT_SECRET, (err, decoded) => {
        if(err) {
            return sendError(res, 403, "Invalid or Expired Token");
        }
        const payload = decoded as jwt.JwtPayload;

        res.locals.userId = payload.id;
        
        next();
    })
    console.log("Authentication Successful")
}

import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";



export async function authCheck(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) {
        return res.status(401).json({message: "Token Missing"});
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
        if(err) {
            return res.status(403).json({message: "Invalid or Expired Token"});
        }
        const payload = decoded as jwt.JwtPayload;

        res.locals.userId = payload.id;
        
        next();
    })
    console.log("Authentication Successful")
}
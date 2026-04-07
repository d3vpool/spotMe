import type { Request, Response } from "express";
import { prisma } from "../db/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export async function createEvent(req: Request, res: Response) {
    try{
        const {title, description } = req.body;
        
        if(!title){
            return res.status(400).json({
                message: "Title is required"
            });
        }

        const userId = res.locals.userId;
        const shareToken = crypto.randomUUID();

        const event = await prisma.event.create({
            data: {
                title: title,
                description: description,
                createdBy: userId,
                shareToken: shareToken
            }
        })

        res.status(201).json(event);
        
    }catch(error) {
        return res.status(500).json({
            message: "Something Went Wrong"
        })
    }
    
}
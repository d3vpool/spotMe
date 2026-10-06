import type { Request, Response } from "express";
import { prisma } from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendSuccess, sendError } from "../utils/response.js";
import { env } from "../config/env.js";

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
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ id: user.id }, env.JWT_SECRET, { expiresIn: "7d" });

    sendSuccess(res, { token }, "User Created Successfully", 201);
  } catch (err) {
    sendError(res, 500, "SignUp failed");
  }
}

export async function logInController(req: Request, res: Response) {
  const body = req.body;

  const email = body.email;
  const password = body.password;

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    return sendError(res, 401, "Invalid email or password");
  }

  const hashedPassword = user.password;

  const match = await bcrypt.compare(password, hashedPassword);

  if (match) {
    const token = jwt.sign(
      {
        id: user.id,
      },
      env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return sendSuccess(res, { token }, "Logged In Successfully");
  } else {
    return sendError(res, 401, "Invalid email or password");
  }
}

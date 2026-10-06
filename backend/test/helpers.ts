/**
 * Test helpers — authenticated requests, signup/login, etc.
 */
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { testPrisma } from "./setup.js";

const JWT_SECRET = process.env.JWT_SECRET!;

/** Create a user and return { user, token }. */
export async function createUserAndToken(overrides?: { email?: string }) {
  const email = overrides?.email || `user-${Date.now()}@test.com`;
  const password = "testpassword123";
  const hashed = await bcrypt.hash(password, 10);

  const user = await testPrisma.user.create({
    data: { email, firstName: "Test", password: hashed },
  });

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
  return { user, token, password };
}

/** Authenticated GET request. */
export function authGet(path: string, token: string) {
  return request(app).get(path).set("Authorization", `Bearer ${token}`);
}

/** Authenticated POST request. */
export function authPost(path: string, token: string, body?: any) {
  return request(app).post(path).set("Authorization", `Bearer ${token}`).send(body);
}

/** Authenticated PATCH request. */
export function authPatch(path: string, token: string, body?: any) {
  return request(app).patch(path).set("Authorization", `Bearer ${token}`).send(body);
}

/** Authenticated DELETE request. */
export function authDelete(path: string, token: string) {
  return request(app).delete(path).set("Authorization", `Bearer ${token}`);
}

/** Unauthenticated POST request. */
export function post(path: string, body?: any) {
  return request(app).post(path).send(body);
}

/** Unauthenticated GET request. */
export function get(path: string) {
  return request(app).get(path);
}

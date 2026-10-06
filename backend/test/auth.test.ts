import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createUserAndToken } from "./helpers.js";

describe("Auth flows", () => {
  describe("POST /user/signup", () => {
    it("creates a user and returns a token", async () => {
      const res = await request(app)
        .post("/user/signup")
        .send({ email: "new@test.com", firstName: "New", password: "password123" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe("string");
    });

    it("rejects duplicate email", async () => {
      // Create user directly in DB to guarantee it exists
      const { testPrisma } = await import("../test/setup.js");
      const bcrypt = await import("bcrypt");
      const hashed = await bcrypt.hash("password123", 10);
      await testPrisma.user.create({
        data: { email: "dup@test.com", firstName: "First", password: hashed },
      });

      const res = await request(app)
        .post("/user/signup")
        .send({ email: "dup@test.com", firstName: "Second", password: "password123" });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 for invalid input (missing email)", async () => {
      const res = await request(app)
        .post("/user/signup")
        .send({ firstName: "NoEmail", password: "password123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBeDefined();
    });

    it("returns 400 for short password", async () => {
      const res = await request(app)
        .post("/user/signup")
        .send({ email: "short@test.com", firstName: "Short", password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /user/login", () => {
    it("returns a token for valid credentials", async () => {
      // Create user first via signup
      await request(app)
        .post("/user/signup")
        .send({ email: "login@test.com", firstName: "Login", password: "password123" });

      const res = await request(app)
        .post("/user/login")
        .send({ email: "login@test.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it("returns 401 for wrong password", async () => {
      await request(app)
        .post("/user/signup")
        .send({ email: "wrongpw@test.com", firstName: "Wrong", password: "password123" });

      const res = await request(app)
        .post("/user/login")
        .send({ email: "wrongpw@test.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe("Invalid email or password");
    });

    it("returns 401 for nonexistent email (same error as wrong password)", async () => {
      const res = await request(app)
        .post("/user/login")
        .send({ email: "nonexistent@test.com", password: "password123" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      // Security: same error message as wrong password — doesn't leak whether email exists
      expect(res.body.error.message).toBe("Invalid email or password");
    });
  });

  describe("Auth middleware", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await request(app).get("/events");
      expect(res.status).toBe(401);
    });

    it("returns 403 for an invalid/expired token", async () => {
      const res = await request(app)
        .get("/events")
        .set("Authorization", "Bearer invalid-token-here");

      expect(res.status).toBe(403);
    });

    it("allows access with a valid token", async () => {
      const { token } = await createUserAndToken();
      const res = await request(app).get("/events").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});

import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createUserAndToken, authGet, authPost } from "./helpers.js";
import { seedTestEvent, seedTestImage, seedTestBatch } from "./setup.js";

describe("Input validation — regression tests for Day 3", () => {
  describe("Malformed route params return 400, not Prisma errors", () => {
    it("GET /events/:eventId with non-numeric eventId", async () => {
      const { token } = await createUserAndToken();
      const res = await authGet("/events/not-a-number", token);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/eventId/);
    });

    it("DELETE /events/:eventId with UUID instead of numeric", async () => {
      const { token } = await createUserAndToken();
      const res = await request(app)
        .delete("/events/550e8400-e29b-41d4-a716-446655440000")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("GET /events/:eventId/upload-status/:batchId with bad batchId", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);
      const res = await authGet(`/events/${event.id}/upload-status/not-a-uuid`, token);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/batchId/);
    });

    it("GET /events/share/:shareToken with invalid UUID", async () => {
      const res = await request(app).get("/events/share/not-a-uuid");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/shareToken/);
    });
  });

  describe("Body validation", () => {
    it("POST /events with missing title returns 400", async () => {
      const { token } = await createUserAndToken();
      const res = await authPost("/events", token, { description: "No title" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("PATCH /events/:eventId with empty body returns 400", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);
      const res = await request(app)
        .patch(`/events/${event.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/at least one/i);
    });

    it("PATCH /events/:eventId/visibility with non-boolean isPublic", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);
      const res = await request(app)
        .patch(`/events/${event.id}/visibility`)
        .set("Authorization", `Bearer ${token}`)
        .send({ isPublic: "yes" });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("HTTP-level middleware wiring (at least one full round-trip per route)", () => {
    it("POST /events validates params via middleware", async () => {
      const { token } = await createUserAndToken();
      // Valid request should succeed
      const res = await authPost("/events", token, { title: "Valid", description: "test" });
      expect(res.status).toBe(201);
    });

    it("GET /events/share/:shareToken validates shareToken via middleware", async () => {
      const { user } = await createUserAndToken();
      const event = await seedTestEvent(user.id, { isPublic: true });
      const res = await request(app).get(`/events/share/${event.shareToken}`);
      expect(res.status).toBe(200);
    });
  });
});

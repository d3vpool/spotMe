import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createUserAndToken, authGet, authPost, authPatch, authDelete } from "./helpers.js";
import { testPrisma, seedTestEvent } from "./setup.js";

describe("Event CRUD + ownership", () => {
  describe("POST /events (create)", () => {
    it("creates an event with valid input", async () => {
      const { token } = await createUserAndToken();
      const res = await authPost("/events", token, {
        title: "My Event",
        description: "A test event",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Controller wraps in { event } inside data
      expect(res.body.data.event.title).toBe("My Event");
    });

    it("requires auth", async () => {
      const res = await request(app).post("/events").send({ title: "No Auth" });
      expect(res.status).toBe(401);
    });

    it("rejects empty title", async () => {
      const { token } = await createUserAndToken();
      const res = await authPost("/events", token, { title: "" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /events/:eventId", () => {
    it("returns the event for the owner", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);

      const res = await authGet(`/events/${event.id}`, token);
      expect(res.status).toBe(200);
      // Controller wraps in { event } inside data
      expect(res.body.data.event.id).toBe(event.id);
    });

    it("returns 404 for another user's event", async () => {
      const { user: userA } = await createUserAndToken();
      const { token: tokenB } = await createUserAndToken();
      const event = await seedTestEvent(userA.id);

      const res = await authGet(`/events/${event.id}`, tokenB);
      // Ownership check uses createdBy in Prisma query — returns 404, not 403
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /events/:eventId (update)", () => {
    it("allows the owner to update title", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);

      const res = await authPatch(`/events/${event.id}`, token, {
        title: "Updated Title",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedEvent.title).toBe("Updated Title");

      const fromDb = await testPrisma.event.findUnique({ where: { id: event.id } });
      expect(fromDb!.title).toBe("Updated Title");
    });

    it("allows the owner to update description", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);

      const res = await authPatch(`/events/${event.id}`, token, {
        description: "New description",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedEvent.description).toBe("New description");
    });

    it("blocks another user from updating", async () => {
      const { user: userA } = await createUserAndToken();
      const { token: tokenB } = await createUserAndToken();
      const event = await seedTestEvent(userA.id);

      const res = await authPatch(`/events/${event.id}`, tokenB, {
        title: "Hacked Title",
      });

      expect(res.status).toBe(404);
      const unchanged = await testPrisma.event.findUnique({ where: { id: event.id } });
      expect(unchanged!.title).not.toBe("Hacked Title");
    });

    it("returns 400 when neither title nor description provided", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);

      const res = await authPatch(`/events/${event.id}`, token, {});
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /events/:eventId", () => {
    it("allows the owner to delete", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id);

      const res = await authDelete(`/events/${event.id}`, token);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const gone = await testPrisma.event.findUnique({ where: { id: event.id } });
      expect(gone).toBeNull();
    });

    it("blocks another user from deleting", async () => {
      const { user: userA } = await createUserAndToken();
      const { token: tokenB } = await createUserAndToken();
      const event = await seedTestEvent(userA.id);

      const res = await authDelete(`/events/${event.id}`, tokenB);
      expect(res.status).toBe(404);

      const still = await testPrisma.event.findUnique({ where: { id: event.id } });
      expect(still).not.toBeNull();
    });
  });

  describe("Visibility toggle", () => {
    it("defaults to private (isPublic: false)", async () => {
      const { user } = await createUserAndToken();
      const event = await seedTestEvent(user.id);
      expect(event.isPublic).toBe(false);
    });

    it("toggle makes event public, share endpoint works", async () => {
      const { user, token } = await createUserAndToken();
      const event = await seedTestEvent(user.id, { isPublic: false });

      // Share should fail while private
      const beforeToggle = await request(app).get(`/events/share/${event.shareToken}`);
      expect(beforeToggle.status).toBe(404);

      // Toggle to public
      const toggleRes = await authPatch(`/events/${event.id}/visibility`, token, {
        isPublic: true,
      });
      expect(toggleRes.status).toBe(200);

      // Share should now work
      const afterToggle = await request(app).get(`/events/share/${event.shareToken}`);
      expect(afterToggle.status).toBe(200);
    });
  });
});

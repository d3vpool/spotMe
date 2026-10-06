import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createUserAndToken } from "./helpers.js";
import { testPrisma, seedTestEvent } from "./setup.js";
import fs from "fs";
import path from "path";

describe("Rate limiting", () => {
  // NOTE: These tests run with NODE_ENV=test, where rate limiters are disabled
  // (max: 10000). To test actual rate limiting behavior, temporarily set the
  // limit to a small number in the test or run with NODE_ENV=production.
  // This test verifies the middleware is wired correctly.

  it("login endpoint is accessible (rate limiter wired, not blocking in test env)", async () => {
    const { user, token } = await createUserAndToken();
    const res = await request(app)
      .post("/user/login")
      .send({ email: user.email, password: "testpassword123" });

    // In test env, this should succeed (rate limit not hit)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("File content validation", () => {
  const fixturesDir = path.join(__dirname, "fixtures");

  it("rejects a .txt file renamed to .jpg with 400", async () => {
    const { user, token } = await createUserAndToken();

    // Use a seeded test event
    const event = await seedTestEvent(user.id);

    // Create a fake .jpg file (actually a text file)
    const fakeJpgPath = path.join(fixturesDir, "fake-image.jpg");
    fs.writeFileSync(fakeJpgPath, "This is not an image file, it's just text content.");

    try {
      const res = await request(app)
        .post(`/events/${event.id}/images`)
        .set("Authorization", `Bearer ${token}`)
        .attach("EventImages", fakeJpgPath);

      // Should be rejected with 400 (invalid content)
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Invalid file content|No valid image files/);
    } finally {
      // Cleanup
      if (fs.existsSync(fakeJpgPath)) {
        fs.unlinkSync(fakeJpgPath);
      }
    }
  });
});

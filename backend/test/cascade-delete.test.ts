import { describe, it, expect } from "vitest";
import { createUserAndToken, authDelete } from "./helpers.js";
import {
  testPrisma,
  seedTestEvent,
  seedTestImage,
  seedTestEmbedding,
  seedTestBatch,
} from "./setup.js";

describe("Cascade delete — regression test for Day 1 + Day 2", () => {
  it("deletes an event with images, embeddings, and batches without FK errors", async () => {
    // 1. Create user + event
    const { user, token } = await createUserAndToken();
    const event = await seedTestEvent(user.id);

    // 2. Create images + embeddings (bypass ML pipeline for speed)
    const image1 = await seedTestImage(event.id);
    const image2 = await seedTestImage(event.id);
    await seedTestEmbedding(image1.id);
    await seedTestEmbedding(image1.id); // two faces in one image
    await seedTestEmbedding(image2.id);

    // 3. Create an UploadBatch
    const batch = await seedTestBatch(event.id, 2);

    // 4. Verify rows exist before deletion
    expect(await testPrisma.image.count({ where: { eventId: event.id } })).toBe(2);
    expect(
      await testPrisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "FaceEmbedding" WHERE "imageId" IN (SELECT id FROM image WHERE "eventId" = $1)`,
        event.id,
      ),
    ).toEqual([{ count: 3n }]);
    expect(await testPrisma.uploadBatch.count({ where: { eventId: event.id } })).toBe(1);

    // 5. Delete the event — must NOT throw FK constraint error
    const res = await authDelete(`/events/${event.id}`, token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // 6. Verify ALL dependent rows are gone
    expect(await testPrisma.event.findUnique({ where: { id: event.id } })).toBeNull();
    expect(await testPrisma.image.count({ where: { eventId: event.id } })).toBe(0);
    expect(
      await testPrisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "FaceEmbedding" WHERE "imageId" IN (SELECT id FROM image WHERE "eventId" = $1)`,
        event.id,
      ),
    ).toEqual([{ count: 0n }]);
    expect(await testPrisma.uploadBatch.count({ where: { eventId: event.id } })).toBe(0);
  });

  it("deletes an event with zero images without errors", async () => {
    const { user, token } = await createUserAndToken();
    const event = await seedTestEvent(user.id);

    const res = await authDelete(`/events/${event.id}`, token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

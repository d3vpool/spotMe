import { describe, it, expect } from "vitest";
import { isFinalAttempt } from "../src/queues/retryPolicy.js";

describe("isFinalAttempt (batch failure-counting guard)", () => {
  it("does NOT count the first failure when a retry is pending (attempts: 2)", () => {
    expect(isFinalAttempt({ attemptsMade: 1, opts: { attempts: 2 } })).toBe(false);
  });

  it("counts the failure once retries are exhausted (attempts: 2)", () => {
    expect(isFinalAttempt({ attemptsMade: 2, opts: { attempts: 2 } })).toBe(true);
  });

  it("counts immediately for single-attempt jobs (BullMQ default attempts: 1)", () => {
    expect(isFinalAttempt({ attemptsMade: 1, opts: {} })).toBe(true);
    expect(isFinalAttempt({ attemptsMade: 1, opts: undefined })).toBe(true);
    expect(isFinalAttempt({ attemptsMade: 1 })).toBe(true);
  });

  it("never counts a job that has not failed yet", () => {
    expect(isFinalAttempt({ attemptsMade: 0, opts: { attempts: 2 } })).toBe(false);
    expect(isFinalAttempt({ attemptsMade: 0 })).toBe(false);
  });
});

/**
 * Retry policy helper for image-processing jobs.
 *
 * BullMQ's worker `failed` event fires on EVERY failed attempt — including
 * attempts that will be retried — not only once retries are exhausted.
 * Batch bookkeeping must therefore count a failure only when the attempt
 * that just failed was the last one allowed by the job's `attempts` option.
 *
 * Empirically confirmed during the Day 7 container test: with attempts:2 a
 * single bad file incremented `UploadBatch.failed` twice and flipped the
 * batch to `completed_with_errors` after attempt 1, before the retry ran.
 * Keeping this pure (no imports) lets the regression test run without
 * pulling in Redis/Prisma.
 */
export function isFinalAttempt(job: {
  attemptsMade: number;
  opts?: { attempts?: number };
}): boolean {
  return job.attemptsMade >= (job.opts?.attempts ?? 1);
}

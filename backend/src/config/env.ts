import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.string().optional().default("3000"),
  FRONTEND_URL: z.string().optional().default("http://localhost:5173"),
  NODE_ENV: z.string().optional(),
  GOOGLE_DRIVE_API_KEY: z
    .string()
    .min(
      1,
      "GOOGLE_DRIVE_API_KEY is required — get one from Google Cloud Console with Drive API enabled",
    ),
  REDIS_URL: z.string().optional().default("redis://localhost:6379"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n❌ Invalid environment variables:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nCopy .env.example to .env and fill in the required values.\n");
  process.exit(1);
}

// Production extra gate: never boot with an obviously-placeholder secret.
// (Zod's min(32) passes for things like "replace-with-a-long-random-string",
// which is exactly the value people forget to change.) Local `docker compose`
// never ships a default secret — the entrypoint generates an ephemeral random
// one instead (DEV_AUTO_GENERATE_SECRETS), so this only fires on real deploys.
if (parsed.data.NODE_ENV === "production") {
  const PLACEHOLDER_PATTERNS: Array<[RegExp, string]> = [
    [/replace[-_ ]?with/i, "still contains 'replace-with'"],
    [/change[-_ ]?me/i, "still contains 'change-me'"],
    [/your[-_ ]?(secret|key|password)/i, "still contains a 'your-…' placeholder"],
    [/example/i, "contains 'example'"],
    [/placeholder/i, "contains 'placeholder'"],
    [/not[-_ ]?a[-_ ]?real/i, "contains 'not-a-real'"],
    [/dummy/i, "contains 'dummy'"],
  ];

  const problems: string[] = [];
  for (const [pattern, why] of PLACEHOLDER_PATTERNS) {
    if (pattern.test(parsed.data.JWT_SECRET)) {
      problems.push(`JWT_SECRET ${why} — generate a real one (e.g. openssl rand -hex 32)`);
    }
    if (pattern.test(parsed.data.DATABASE_URL)) {
      problems.push(`DATABASE_URL ${why} — set a real connection string`);
    }
  }

  if (problems.length > 0) {
    console.error("\n❌ Refusing to start in production with insecure defaults:\n");
    for (const problem of problems) {
      console.error(`  • ${problem}`);
    }
    console.error("\nSee DEPLOY.md for how to set real secrets.\n");
    process.exit(1);
  }
}

export const env = {
  ...parsed.data,
  PORT: Number(parsed.data.PORT),
};

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    PORT: z.string().optional().default("3000"),
    FRONTEND_URL: z.string().optional().default("http://localhost:5173"),
    NODE_ENV: z.string().optional(),
    GOOGLE_DRIVE_API_KEY: z.string().min(1, "GOOGLE_DRIVE_API_KEY is required — get one from Google Cloud Console with Drive API enabled"),
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

export const env = {
    ...parsed.data,
    PORT: Number(parsed.data.PORT),
};

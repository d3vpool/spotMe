import multer from "multer";
import { fileTypeFromFile } from "file-type";
import fs from "fs";
import path from "path";

// CWD-relative, same as express.static(path.resolve("uploads")) in app.ts
// (both resolve to backend/uploads when the server runs from backend/).
const UPLOADS_DIR = path.resolve("uploads");

// uploads/ is gitignored, so it does NOT exist on a fresh checkout or a fresh
// deploy — and Multer's diskStorage does NOT create its destination directory
// (ENOENT → global 500 instead of 400, and every upload fails in production).
// Ensure it exists once at module load; the destination callback re-ensures it
// cheaply in case the directory was removed while the process was running.
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    } catch (err) {
      cb(err as Error, UPLOADS_DIR);
    }
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Allowed MIME types (must match file-type detection results)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

//FILE FILTER — basic MIME check (quick rejection before upload)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * Validate actual file content matches an allowed image type.
 * Reads the first bytes of the file to detect real MIME type,
 * not just the client-supplied MIME string.
 * Must be called after multer has written the file to disk.
 */
export async function validateFileContent(
  filePath: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const type = await fileTypeFromFile(filePath);
    if (!type || !ALLOWED_MIME_TYPES.includes(type.mime)) {
      // Delete the invalid file
      try {
        fs.unlinkSync(filePath);
      } catch {
        // File may already be deleted
      }
      return {
        valid: false,
        error: `Invalid file content: expected image, got ${type?.mime ?? "unknown"}`,
      };
    }
    return { valid: true };
  } catch (err) {
    // File read error — delete and reject
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore
    }
    return { valid: false, error: "Failed to read file for validation" };
  }
}

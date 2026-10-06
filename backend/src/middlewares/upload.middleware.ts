import multer from "multer";
import { fileTypeFromFile } from "file-type";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
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

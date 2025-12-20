/**
 * File Upload Service
 * Handles secure file uploads for resumes and other documents
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const RESUME_DIR = path.join(UPLOAD_DIR, "resumes");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(RESUME_DIR)) {
    fs.mkdirSync(RESUME_DIR, { recursive: true });
}

// Allowed file types for resumes
const ALLOWED_RESUME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, RESUME_DIR);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueId = crypto.randomBytes(16).toString("hex");
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${uniqueId}${ext}`;
        cb(null, safeName);
    }
});

// File filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
        return;
    }

    if (!ALLOWED_RESUME_TYPES.includes(file.mimetype)) {
        cb(new Error("Invalid MIME type for resume"));
        return;
    }

    cb(null, true);
};

// Resume upload middleware
export const uploadResume = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    }
}).single("resume");

// Handle multer errors
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large. Maximum size is 5MB" });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    if (err) {
        return res.status(400).json({ error: err.message });
    }

    next();
};

// Get file URL from filename
export const getFileUrl = (filename: string): string => {
    return `/uploads/resumes/${filename}`;
};

// Delete file
export const deleteFile = (filename: string): boolean => {
    try {
        const filePath = path.join(RESUME_DIR, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch {
        return false;
    }
};

export default {
    uploadResume,
    handleUploadError,
    getFileUrl,
    deleteFile,
    RESUME_DIR,
    UPLOAD_DIR
};

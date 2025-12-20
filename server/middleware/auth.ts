/**
 * Authentication Middleware and Utilities
 * Provides secure password hashing, JWT tokens, and route protection
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || "talent-nexus-jwt-secret-key-2024";
const JWT_EXPIRES_IN = "24h";
const SALT_ROUNDS = 10;

// ===========================================
// PASSWORD UTILITIES
// ===========================================

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

// ===========================================
// JWT UTILITIES
// ===========================================

interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JWTPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
};

// ===========================================
// EXPRESS MIDDLEWARE
// ===========================================

export interface AuthRequest extends Request {
    user?: JWTPayload;
}

// Authenticate any logged-in user
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = payload;
    next();
};

// Require specific role(s)
export const requireRole = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access denied. Required role: ${roles.join(" or ")}` });
        }

        next();
    };
};

// Candidate-only routes
export const candidateOnly = [authenticate, requireRole("candidate")];

// Recruiter-only routes  
export const recruiterOnly = [authenticate, requireRole("recruiter", "admin")];

// Admin-only routes
export const adminOnly = [authenticate, requireRole("admin")];

// ===========================================
// INPUT VALIDATION SCHEMAS (Zod)
// ===========================================

export const schemas = {
    // Auth schemas
    register: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        firstName: z.string().min(1, "First name required").optional(),
        lastName: z.string().min(1, "Last name required").optional(),
        role: z.enum(["candidate", "recruiter"]).default("candidate")
    }),

    login: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password required")
    }),

    // Profile update
    profileUpdate: z.object({
        profile: z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            phone: z.string().optional(),
            headline: z.string().optional(),
            summary: z.string().optional(),
            location: z.string().optional(),
            linkedIn: z.string().url().optional().or(z.literal("")),
            portfolio: z.string().url().optional().or(z.literal("")),
            skills: z.array(z.string()).optional(),
            experience: z.string().optional(),
            education: z.string().optional()
        }).optional(),
        resume: z.object({
            url: z.string().optional(),
            filename: z.string().optional()
        }).optional()
    }),

    // Job application
    applyJob: z.object({
        jobId: z.string().min(1, "Job ID required"),
        coverLetter: z.string().optional()
    }),

    // Application status update
    updateApplication: z.object({
        status: z.enum(["applied", "shortlisted", "assessment", "interview", "hired", "rejected"]),
        notes: z.string().optional()
    })
};

// Validation middleware factory
export const validate = <T>(schema: z.ZodSchema<T>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.errors.map(e => ({
                field: e.path.join("."),
                message: e.message
            }));
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        req.body = result.data;
        next();
    };
};

// ===========================================
// SANITIZATION UTILITIES
// ===========================================

export const sanitizeInput = (input: string): string => {
    return input
        .replace(/[<>]/g, "") // Remove potential HTML tags
        .trim();
};

export const sanitizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
};

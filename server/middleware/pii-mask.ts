/**
 * PII Masking Middleware - Protect candidate personal information
 * Hackathon Implementation for GCC Hiring Platform
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../storage";
import { auditLogs } from "../../shared/schema";

// PII patterns
const EMAIL_PATTERN = /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_PATTERN = /\d{3}-\d{2}-\d{4}/g;
const AADHAAR_PATTERN = /\d{4}\s?\d{4}\s?\d{4}/g;

export interface PIIMaskingOptions {
    maskEmail?: boolean;
    maskPhone?: boolean;
    maskSSN?: boolean;
    maskAadhaar?: boolean;
    excludePaths?: string[];
}

const defaultOptions: PIIMaskingOptions = {
    maskEmail: true,
    maskPhone: true,
    maskSSN: true,
    maskAadhaar: true,
    excludePaths: ["/api/admin", "/api/unlock-pii"],
};

/**
 * Mask email address: john.doe@example.com -> j***@example.com
 */
export function maskEmail(email: string): string {
    return email.replace(EMAIL_PATTERN, (match, local, domain) => {
        if (local.length <= 2) return `${local[0]}***@${domain}`;
        return `${local[0]}***@${domain}`;
    });
}

/**
 * Mask phone number: +91 9876543210 -> +91 ****3210
 */
export function maskPhone(phone: string): string {
    return phone.replace(PHONE_PATTERN, (match) => {
        const digits = match.replace(/\D/g, "");
        if (digits.length < 4) return "****";
        return `****${digits.slice(-4)}`;
    });
}

/**
 * Mask SSN: 123-45-6789 -> ***-**-6789
 */
export function maskSSN(ssn: string): string {
    return ssn.replace(SSN_PATTERN, (match) => `***-**-${match.slice(-4)}`);
}

/**
 * Mask Aadhaar: 1234 5678 9012 -> **** **** 9012
 */
export function maskAadhaar(aadhaar: string): string {
    return aadhaar.replace(AADHAAR_PATTERN, (match) => {
        const digits = match.replace(/\s/g, "");
        return `**** **** ${digits.slice(-4)}`;
    });
}

/**
 * Recursively mask PII in an object
 */
export function maskPIIInObject(obj: unknown, options: PIIMaskingOptions = defaultOptions): unknown {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === "string") {
        let result = obj;
        if (options.maskEmail) result = maskEmail(result);
        if (options.maskPhone) result = maskPhone(result);
        if (options.maskSSN) result = maskSSN(result);
        if (options.maskAadhaar) result = maskAadhaar(result);
        return result;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => maskPIIInObject(item, options));
    }

    if (typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            // Special handling for known PII fields
            if (["email", "candidateEmail", "phone", "candidatePhone"].includes(key)) {
                if (typeof value === "string") {
                    if (key.toLowerCase().includes("email")) {
                        result[key] = options.maskEmail ? maskEmail(value) : value;
                    } else if (key.toLowerCase().includes("phone")) {
                        result[key] = options.maskPhone ? maskPhone(value) : value;
                    } else {
                        result[key] = maskPIIInObject(value, options);
                    }
                } else {
                    result[key] = value;
                }
            } else {
                result[key] = maskPIIInObject(value, options);
            }
        }
        return result;
    }

    return obj;
}

/**
 * Express middleware to mask PII in responses
 */
export function piiMaskingMiddleware(options: PIIMaskingOptions = defaultOptions) {
    return (req: Request, res: Response, next: NextFunction) => {
        // Check if path is excluded
        const isExcluded = options.excludePaths?.some((path) => req.path.startsWith(path));

        // Check for unlock header (for authorized PII access)
        const hasUnlockToken = req.headers["x-pii-unlock"] === "true";

        if (isExcluded || hasUnlockToken) {
            return next();
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to mask PII
        res.json = (body: unknown) => {
            const maskedBody = maskPIIInObject(body, options);
            return originalJson(maskedBody);
        };

        next();
    };
}

/**
 * Log PII access for audit trail
 */
export async function logPIIAccess(
    userId: string,
    userEmail: string,
    resourceType: string,
    resourceId: string,
    action: "view" | "unlock_pii" | "download" | "export",
    ipAddress?: string,
    userAgent?: string
) {
    await db.insert(auditLogs).values({
        userId,
        userEmail,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        success: true,
    });
}

/**
 * Strip PII before sending to AI/LLM
 */
export interface PIIMapping {
    original: string;
    placeholder: string;
}

export function stripPIIForAI(text: string): { cleanText: string; mappings: PIIMapping[] } {
    const mappings: PIIMapping[] = [];
    let cleanText = text;
    let emailCounter = 1;
    let phoneCounter = 1;

    // Replace emails
    cleanText = cleanText.replace(EMAIL_PATTERN, (match) => {
        const placeholder = `[EMAIL_${emailCounter++}]`;
        mappings.push({ original: match, placeholder });
        return placeholder;
    });

    // Replace phone numbers
    cleanText = cleanText.replace(PHONE_PATTERN, (match) => {
        const placeholder = `[PHONE_${phoneCounter++}]`;
        mappings.push({ original: match, placeholder });
        return placeholder;
    });

    // Replace names (simple pattern - would need NER for production)
    // For hackathon: just use the existing replacements

    return { cleanText, mappings };
}

/**
 * Restore PII from AI response using mappings
 */
export function restorePIIFromAI(text: string, mappings: PIIMapping[]): string {
    let result = text;
    for (const mapping of mappings) {
        result = result.replace(new RegExp(mapping.placeholder, "g"), mapping.original);
    }
    return result;
}

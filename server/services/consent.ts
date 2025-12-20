/**
 * Consent Service - Manage user consent records
 * Hackathon Implementation for GCC Hiring Platform
 */

import { db } from "../storage";
import { consentRecords } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

export type ConsentType =
    | "proctoring"
    | "recording"
    | "data_processing"
    | "ai_analysis"
    | "communication";

export interface ConsentRequest {
    userId?: string;
    resumeId?: string;
    consentType: ConsentType;
    consentGiven: boolean;
    ipAddress?: string;
    userAgent?: string;
    context?: string; // assessment | interview | onboarding
}

// Consent text versions
export const CONSENT_TEXTS: Record<ConsentType, { version: string; text: string }> = {
    proctoring: {
        version: "1.0",
        text: `I understand and agree that this assessment will be proctored. This includes:
    - Monitoring of tab switches and browser focus
    - Detection of copy/paste activities
    - Screen activity monitoring
    - Webcam monitoring (if enabled)
    
    This data will be used to ensure assessment integrity and may be reviewed by the hiring team.`,
    },
    recording: {
        version: "1.0",
        text: `I consent to the recording of this session. The recording may include:
    - Video recording via webcam
    - Audio recording via microphone
    - Screen recording
    
    These recordings will be stored securely and used only for evaluation purposes.`,
    },
    data_processing: {
        version: "1.0",
        text: `I consent to the processing of my personal data for recruitment purposes. This includes:
    - Resume and application data
    - Interview feedback and scores
    - Assessment results
    
    My data will be handled in accordance with applicable privacy laws.`,
    },
    ai_analysis: {
        version: "1.0",
        text: `I consent to the use of AI/ML technologies to analyze my application. This may include:
    - Resume parsing and skill extraction
    - Candidate-job matching algorithms
    - Interview sentiment analysis
    
    AI-assisted decisions will be reviewed by human recruiters.`,
    },
    communication: {
        version: "1.0",
        text: `I consent to receive communications regarding my application via email and phone. 
    This includes updates on application status, interview scheduling, and offer details.`,
    },
};

/**
 * Record a consent decision
 */
export async function recordConsent(request: ConsentRequest): Promise<string> {
    const { consentType, consentGiven, userId, resumeId, ipAddress, userAgent, context } = request;
    const consentInfo = CONSENT_TEXTS[consentType];

    const [record] = await db
        .insert(consentRecords)
        .values({
            userId,
            resumeId,
            consentType,
            consentGiven,
            consentText: consentInfo.text,
            version: consentInfo.version,
            ipAddress,
            userAgent,
            context,
        })
        .returning();

    return record.id;
}

/**
 * Check if user has given consent for a specific type
 */
export async function hasConsent(
    consentType: ConsentType,
    options: { userId?: string; resumeId?: string }
): Promise<boolean> {
    const { userId, resumeId } = options;

    if (!userId && !resumeId) {
        return false;
    }

    const conditions = [
        eq(consentRecords.consentType, consentType),
        eq(consentRecords.consentGiven, true),
    ];

    if (userId) {
        conditions.push(eq(consentRecords.userId, userId));
    }
    if (resumeId) {
        conditions.push(eq(consentRecords.resumeId, resumeId));
    }

    const records = await db
        .select()
        .from(consentRecords)
        .where(and(...conditions))
        .limit(1);

    return records.length > 0;
}

/**
 * Get all consents for a user/candidate
 */
export async function getConsents(options: { userId?: string; resumeId?: string }) {
    const { userId, resumeId } = options;

    if (!userId && !resumeId) {
        return [];
    }

    let query = db.select().from(consentRecords);

    if (userId) {
        query = query.where(eq(consentRecords.userId, userId));
    } else if (resumeId) {
        query = query.where(eq(consentRecords.resumeId, resumeId));
    }

    return query.orderBy(consentRecords.timestamp);
}

/**
 * Check required consents before assessment
 */
export async function checkRequiredConsentsForAssessment(
    options: { userId?: string; resumeId?: string }
): Promise<{ valid: boolean; missing: ConsentType[] }> {
    const requiredConsents: ConsentType[] = ["proctoring", "data_processing"];
    const missing: ConsentType[] = [];

    for (const consentType of requiredConsents) {
        const has = await hasConsent(consentType, options);
        if (!has) {
            missing.push(consentType);
        }
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

/**
 * Withdraw consent (for GDPR compliance)
 */
export async function withdrawConsent(
    consentType: ConsentType,
    options: { userId?: string; resumeId?: string },
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    const { userId, resumeId } = options;

    // Record the withdrawal as a new consent record with consentGiven = false
    await db.insert(consentRecords).values({
        userId,
        resumeId,
        consentType,
        consentGiven: false,
        consentText: `Consent withdrawn for: ${consentType}`,
        version: CONSENT_TEXTS[consentType].version,
        ipAddress,
        userAgent,
        context: "withdrawal",
    });
}

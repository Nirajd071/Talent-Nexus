/**
 * Plagiarism Check Service
 * Basic similarity detection for Hackathon scope
 */

import { db } from "../storage";
import { testSubmissions } from "../../shared/schema";
import { eq, not, and } from "drizzle-orm";

interface SimilarityResult {
    score: number; // 0-1
    isFlagged: boolean;
    matchFound?: boolean;
}

/**
 * Calculate Jaccard Similarity between two texts
 * (Intersection over Union of char 3-grams)
 */
function calculateJaccardSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().replace(/\s+/g, " ");
    const s2 = str2.toLowerCase().replace(/\s+/g, " ");

    if (s1 === s2) return 1;

    // Create 3-grams
    const grams1 = new Set();
    const grams2 = new Set();

    for (let i = 0; i < s1.length - 2; i++) {
        grams1.add(s1.substring(i, i + 3));
    }

    for (let i = 0; i < s2.length - 2; i++) {
        grams2.add(s2.substring(i, i + 3));
    }

    if (grams1.size === 0 || grams2.size === 0) return 0;

    // Calculate intersection
    let intersection = 0;
    grams1.forEach(gram => {
        if (grams2.has(gram)) intersection++;
    });

    // Calculate union
    const union = grams1.size + grams2.size - intersection;

    return intersection / union;
}

/**
 * Check a submission against other submissions for the same assessment
 */
export async function checkPlagiarism(
    submissionId: string,
    text: string,
    testId: string
): Promise<SimilarityResult> {
    // Get other submissions for same test
    const otherSubmissions = await db
        .select()
        .from(testSubmissions)
        .where(
            and(
                eq(testSubmissions.skillTestId, testId),
                not(eq(testSubmissions.id, submissionId))
            )
        );

    let maxSimilarity = 0;
    let matchFound = false;

    for (const sub of otherSubmissions) {
        if (!sub.code && !sub.answers) continue;

        // Compare code or combined answers
        const otherText = sub.code || JSON.stringify(sub.answers);
        const score = calculateJaccardSimilarity(text, otherText);

        if (score > maxSimilarity) {
            maxSimilarity = score;
        }

        if (score > 0.85) { // 85% similarity threshold
            matchFound = true;
            break;
        }
    }

    return {
        score: maxSimilarity,
        isFlagged: maxSimilarity > 0.85,
        matchFound
    };
}

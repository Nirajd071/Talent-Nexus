/**
 * Resume Parser Service - FIXED for ES Modules
 * Uses Python pypdf for comprehensive PDF resume parsing
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { extractSkillsFromText } from "./skill-matching";

// Fix for ES modules - get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FULL_PARSER_SCRIPT = join(__dirname, "../utils/parse_resume_full.py");
const SIMPLE_PARSER_SCRIPT = join(__dirname, "../utils/extract_pdf.py");

/**
 * Comprehensive parsed resume structure
 */
export interface ParsedResumeData {
    name?: string;
    email?: string;
    phone?: string;
    education: Array<{
        institution: string;
        degree: string;
        gpa: string;
        duration: string;
    }>;
    technicalSkills: string[];
    experience: Array<{
        title: string;
        company: string;
        duration: string;
        responsibilities: string[];
    }>;
    projects: Array<{
        name: string;
        technologies: string[];
        description: string;
    }>;
    certifications: string[];
    rawText: string;
    parsed: boolean;
    extractedAt?: Date;
}

/**
 * Parse resume from PDF file using Python pypdf
 */
export async function parseResumeFromPDF(pdfPath: string): Promise<ParsedResumeData> {
    return new Promise((resolve, reject) => {
        if (!existsSync(pdfPath)) {
            reject(new Error(`PDF file not found: ${pdfPath}`));
            return;
        }

        // Check which Python script exists
        const scriptPath = existsSync(FULL_PARSER_SCRIPT) ? FULL_PARSER_SCRIPT : SIMPLE_PARSER_SCRIPT;
        const useFullParser = existsSync(FULL_PARSER_SCRIPT);

        console.log(`Using parser: ${scriptPath}`);

        // Try python3 first, then python
        const tryPython = (cmd: string) => {
            const pythonProcess = spawn(cmd, [scriptPath, pdfPath]);

            let output = "";
            let errorOutput = "";

            pythonProcess.stdout.on("data", (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on("data", (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on("close", (code) => {
                if (code === 0 && output.trim()) {
                    if (useFullParser) {
                        try {
                            const parsed = JSON.parse(output.trim());
                            parsed.extractedAt = new Date();

                            // Also extract skills using ontology for better coverage
                            const ontologySkills = extractSkillsFromText(parsed.rawText || output);
                            parsed.technicalSkills = Array.from(new Set([
                                ...(parsed.technicalSkills || []),
                                ...ontologySkills
                            ]));

                            console.log(`Resume parsed: ${parsed.technicalSkills?.length || 0} skills found`);
                            resolve(parsed);
                        } catch (e) {
                            // JSON parse failed, return raw text with ontology skills
                            const skills = extractSkillsFromText(output);
                            resolve({
                                technicalSkills: skills,
                                rawText: output,
                                parsed: false,
                                education: [],
                                experience: [],
                                projects: [],
                                certifications: [],
                                extractedAt: new Date()
                            });
                        }
                    } else {
                        // Simple parser - just text extraction
                        const skills = extractSkillsFromText(output);
                        resolve({
                            technicalSkills: skills,
                            rawText: output,
                            parsed: true,
                            education: [],
                            experience: [],
                            projects: [],
                            certifications: [],
                            extractedAt: new Date()
                        });
                    }
                } else if (cmd === "python3") {
                    // Try python as fallback
                    tryPython("python");
                } else {
                    reject(new Error(`PDF parsing failed: ${errorOutput || "Unknown error"}`));
                }
            });

            pythonProcess.on("error", (err) => {
                if (cmd === "python3") {
                    tryPython("python");
                } else {
                    reject(new Error(`Failed to start Python: ${err.message}`));
                }
            });
        };

        tryPython("python3");
    });
}

/**
 * Extract just text from PDF (simpler function)
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!existsSync(pdfPath)) {
            reject(new Error(`PDF file not found: ${pdfPath}`));
            return;
        }

        const pythonProcess = spawn("python3", [SIMPLE_PARSER_SCRIPT, pdfPath]);

        let output = "";
        let errorOutput = "";

        pythonProcess.stdout.on("data", (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on("close", (code) => {
            if (code === 0 && output.trim()) {
                resolve(output.trim());
            } else {
                reject(new Error(`PDF extraction failed: ${errorOutput}`));
            }
        });

        pythonProcess.on("error", (err) => {
            reject(new Error(`Failed to start Python: ${err.message}`));
        });
    });
}

export default {
    parseResumeFromPDF,
    extractTextFromPDF
};

/**
 * Bulk Import/Export API Routes
 * CSV import for candidates and data export
 */

import { Router, Request, Response } from "express";
import { Candidate, Job, Application } from "../db";
import mongoose from "mongoose";

const router = Router();

// ==========================================
// CSV PARSER HELPER
// ==========================================

function parseCSV(csvText: string): { headers: string[]; rows: any[] } {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
        return { headers: [], rows: [] };
    }

    // Parse headers
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

    // Parse rows
    const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const row: any = {};
        headers.forEach((header, i) => {
            row[header] = values[i] || "";
        });
        return row;
    });

    return { headers, rows };
}

// ==========================================
// CANDIDATE IMPORT
// ==========================================

// Preview import (validate CSV)
router.post("/candidates/preview", async (req: Request, res: Response) => {
    try {
        const { csvData } = req.body;

        if (!csvData) {
            return res.status(400).json({ error: "CSV data is required" });
        }

        const { headers, rows } = parseCSV(csvData);

        // Required fields
        const requiredFields = ["name", "email"];
        const optionalFields = ["phone", "skills", "experience", "location", "source", "linkedin", "notes"];
        const allFields = [...requiredFields, ...optionalFields];

        // Map headers to known fields
        const fieldMapping: Record<string, string> = {};
        headers.forEach(header => {
            const normalized = header.toLowerCase().replace(/[^a-z]/g, "");
            if (normalized.includes("name") && !fieldMapping.name) {
                fieldMapping[header] = "name";
            } else if (normalized.includes("email")) {
                fieldMapping[header] = "email";
            } else if (normalized.includes("phone") || normalized.includes("mobile")) {
                fieldMapping[header] = "phone";
            } else if (normalized.includes("skill")) {
                fieldMapping[header] = "skills";
            } else if (normalized.includes("experience") || normalized.includes("years")) {
                fieldMapping[header] = "experience";
            } else if (normalized.includes("location") || normalized.includes("city")) {
                fieldMapping[header] = "location";
            } else if (normalized.includes("source")) {
                fieldMapping[header] = "source";
            } else if (normalized.includes("linkedin")) {
                fieldMapping[header] = "linkedin";
            } else if (normalized.includes("note")) {
                fieldMapping[header] = "notes";
            }
        });

        // Validate rows
        const validRows: any[] = [];
        const invalidRows: any[] = [];

        rows.forEach((row, index) => {
            const mappedRow: any = {};
            let hasName = false;
            let hasEmail = false;

            Object.entries(fieldMapping).forEach(([csvHeader, field]) => {
                mappedRow[field] = row[csvHeader];
                if (field === "name" && row[csvHeader]) hasName = true;
                if (field === "email" && row[csvHeader]) hasEmail = true;
            });

            if (hasName && hasEmail) {
                validRows.push({ ...mappedRow, _rowIndex: index + 2 });
            } else {
                invalidRows.push({ ...row, _rowIndex: index + 2, _error: "Missing name or email" });
            }
        });

        res.json({
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows: invalidRows.length,
            fieldMapping,
            preview: validRows.slice(0, 5),
            errors: invalidRows.slice(0, 10)
        });
    } catch (error) {
        console.error("Preview import error:", error);
        res.status(500).json({ error: "Failed to parse CSV" });
    }
});

// Execute import
router.post("/candidates/import", async (req: Request, res: Response) => {
    try {
        const { csvData, skipDuplicates = true } = req.body;

        if (!csvData) {
            return res.status(400).json({ error: "CSV data is required" });
        }

        const { headers, rows } = parseCSV(csvData);

        // Build field mapping (same logic as preview)
        const fieldMapping: Record<string, string> = {};
        headers.forEach(header => {
            const normalized = header.toLowerCase().replace(/[^a-z]/g, "");
            if (normalized.includes("name") && !fieldMapping.name) fieldMapping[header] = "name";
            else if (normalized.includes("email")) fieldMapping[header] = "email";
            else if (normalized.includes("phone")) fieldMapping[header] = "phone";
            else if (normalized.includes("skill")) fieldMapping[header] = "skills";
            else if (normalized.includes("experience")) fieldMapping[header] = "experience";
            else if (normalized.includes("location")) fieldMapping[header] = "location";
            else if (normalized.includes("source")) fieldMapping[header] = "source";
            else if (normalized.includes("linkedin")) fieldMapping[header] = "linkedin";
        });

        let imported = 0;
        let skipped = 0;
        let failed = 0;

        for (const row of rows) {
            try {
                const candidate: any = { status: "new", source: "import" };

                Object.entries(fieldMapping).forEach(([csvHeader, field]) => {
                    if (row[csvHeader]) {
                        if (field === "skills") {
                            candidate.skills = row[csvHeader].split(";").map((s: string) => s.trim());
                        } else if (field === "experience") {
                            candidate.experienceYears = parseInt(row[csvHeader]) || 0;
                        } else {
                            candidate[field] = row[csvHeader];
                        }
                    }
                });

                if (!candidate.name || !candidate.email) {
                    failed++;
                    continue;
                }

                // Check for duplicates
                if (skipDuplicates) {
                    const existing = await Candidate.findOne({ email: candidate.email });
                    if (existing) {
                        skipped++;
                        continue;
                    }
                }

                await Candidate.create(candidate);
                imported++;
            } catch (err) {
                failed++;
            }
        }

        res.json({
            success: true,
            imported,
            skipped,
            failed,
            total: rows.length
        });
    } catch (error) {
        console.error("Import error:", error);
        res.status(500).json({ error: "Failed to import candidates" });
    }
});

// ==========================================
// CANDIDATE EXPORT
// ==========================================

router.get("/candidates/export", async (req: Request, res: Response) => {
    try {
        const { status, source, limit = 1000 } = req.query;
        const query: any = {};

        if (status) query.status = status;
        if (source) query.source = source;

        const candidates = await Candidate.find(query)
            .limit(Number(limit))
            .lean();

        // Build CSV
        const headers = ["Name", "Email", "Phone", "Skills", "Experience (Years)", "Location", "Source", "Status", "Created At"];
        const csvRows = [headers.join(",")];

        candidates.forEach((c: any) => {
            const row = [
                `"${c.name || ""}"`,
                `"${c.email || ""}"`,
                `"${c.phone || ""}"`,
                `"${(c.skills || []).join("; ")}"`,
                c.experienceYears || "",
                `"${c.location || ""}"`,
                `"${c.source || ""}"`,
                `"${c.status || ""}"`,
                c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : ""
            ];
            csvRows.push(row.join(","));
        });

        const csv = csvRows.join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="candidates-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: "Failed to export candidates" });
    }
});

// ==========================================
// JOB EXPORT
// ==========================================

router.get("/jobs/export", async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const query: any = {};
        if (status) query.status = status;

        const jobs = await Job.find(query).lean();

        const headers = ["Title", "Department", "Location", "Type", "Status", "Applications", "Created At"];
        const csvRows = [headers.join(",")];

        jobs.forEach((j: any) => {
            const row = [
                `"${j.title || ""}"`,
                `"${j.department || ""}"`,
                `"${j.location || ""}"`,
                `"${j.type || ""}"`,
                `"${j.status || ""}"`,
                j.applicationCount || 0,
                j.createdAt ? new Date(j.createdAt).toISOString().split("T")[0] : ""
            ];
            csvRows.push(row.join(","));
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="jobs-${Date.now()}.csv"`);
        res.send(csvRows.join("\n"));
    } catch (error) {
        res.status(500).json({ error: "Failed to export jobs" });
    }
});

// ==========================================
// REFERRAL EXPORT
// ==========================================

router.get("/referrals/export", async (req: Request, res: Response) => {
    try {
        const Referral = mongoose.models.Referral;
        if (!Referral) {
            return res.status(400).json({ error: "Referral model not available" });
        }

        const referrals = await Referral.find().lean();

        const headers = ["Referrer Name", "Referrer Email", "Candidate Name", "Candidate Email", "Position", "Status", "Date"];
        const csvRows = [headers.join(",")];

        referrals.forEach((r: any) => {
            const row = [
                `"${r.referrerName || ""}"`,
                `"${r.referrerEmail || ""}"`,
                `"${r.candidateName || ""}"`,
                `"${r.candidateEmail || ""}"`,
                `"${r.jobTitle || ""}"`,
                `"${r.status || ""}"`,
                r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : ""
            ];
            csvRows.push(row.join(","));
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="referrals-${Date.now()}.csv"`);
        res.send(csvRows.join("\n"));
    } catch (error) {
        res.status(500).json({ error: "Failed to export referrals" });
    }
});

// ==========================================
// IMPORT TEMPLATE
// ==========================================

router.get("/templates/candidates", async (req: Request, res: Response) => {
    const template = `Name,Email,Phone,Skills,Experience (Years),Location,Source,LinkedIn,Notes
John Doe,john@example.com,+1234567890,"JavaScript; React; Node.js",5,New York,LinkedIn,https://linkedin.com/in/johndoe,Great frontend developer
Jane Smith,jane@example.com,+0987654321,"Python; Machine Learning",3,San Francisco,Referral,,Data science background`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"candidates-import-template.csv\"");
    res.send(template);
});

export default router;

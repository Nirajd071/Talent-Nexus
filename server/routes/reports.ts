/**
 * Custom Reports Builder API
 * Create and run custom hiring reports
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Candidate, Job, Application, User } from "../db";

const router = Router();

// ==========================================
// REPORT SCHEMA
// ==========================================

const reportSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ["candidates", "jobs", "applications", "hiring", "diversity", "custom"], default: "custom" },

    // Data source and filters
    dataSource: { type: String, enum: ["candidates", "jobs", "applications", "interviews", "offers"], required: true },
    filters: [{
        field: String,
        operator: { type: String, enum: ["equals", "not_equals", "contains", "greater_than", "less_than", "between", "in"] },
        value: mongoose.Schema.Types.Mixed
    }],

    // Columns/fields to include
    columns: [{
        field: String,
        label: String,
        format: { type: String, enum: ["text", "number", "date", "currency", "percentage"] }
    }],

    // Aggregations
    groupBy: String,
    aggregations: [{
        field: String,
        operation: { type: String, enum: ["count", "sum", "avg", "min", "max"] },
        label: String
    }],

    // Sorting
    sortBy: { field: String, direction: { type: String, enum: ["asc", "desc"], default: "desc" } },

    // Schedule
    schedule: {
        enabled: { type: Boolean, default: false },
        frequency: { type: String, enum: ["daily", "weekly", "monthly"] },
        recipients: [String], // email addresses
        lastRun: Date
    },

    // Metadata
    isFavorite: { type: Boolean, default: false },
    createdBy: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

// ==========================================
// REPORT CRUD
// ==========================================

router.get("/", async (req: Request, res: Response) => {
    try {
        const { type, favorite } = req.query;
        const query: any = {};
        if (type) query.type = type;
        if (favorite === "true") query.isFavorite = true;

        const reports = await Report.find(query).sort({ updatedAt: -1 }).lean();
        res.json(reports);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch reports" });
    }
});

router.get("/:id", async (req: Request, res: Response) => {
    try {
        const report = await Report.findById(req.params.id).lean();
        if (!report) return res.status(404).json({ error: "Report not found" });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch report" });
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        const report = new Report(req.body);
        await report.save();
        res.status(201).json(report);
    } catch (error) {
        res.status(500).json({ error: "Failed to create report" });
    }
});

router.put("/:id", async (req: Request, res: Response) => {
    try {
        const report = await Report.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!report) return res.status(404).json({ error: "Report not found" });
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: "Failed to update report" });
    }
});

router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await Report.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete report" });
    }
});

// Toggle favorite
router.post("/:id/favorite", async (req: Request, res: Response) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ error: "Report not found" });

        report.isFavorite = !report.isFavorite;
        await report.save();

        res.json({ success: true, isFavorite: report.isFavorite });
    } catch (error) {
        res.status(500).json({ error: "Failed to toggle favorite" });
    }
});

// ==========================================
// RUN REPORT
// ==========================================

router.post("/:id/run", async (req: Request, res: Response) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ error: "Report not found" });

        const data = await runReport(report);
        res.json({
            reportName: report.name,
            generatedAt: new Date().toISOString(),
            rowCount: data.length,
            data
        });
    } catch (error: any) {
        console.error("Run report error:", error);
        res.status(500).json({ error: "Failed to run report", details: error.message });
    }
});

// Run ad-hoc report
router.post("/run-adhoc", async (req: Request, res: Response) => {
    try {
        const data = await runReport(req.body);
        res.json({
            generatedAt: new Date().toISOString(),
            rowCount: data.length,
            data
        });
    } catch (error: any) {
        res.status(500).json({ error: "Failed to run report", details: error.message });
    }
});

// ==========================================
// EXPORT REPORT
// ==========================================

router.get("/:id/export", async (req: Request, res: Response) => {
    try {
        const { format = "csv" } = req.query;
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ error: "Report not found" });

        const data = await runReport(report);

        if (format === "csv") {
            // Generate CSV
            const columns = report.columns || [];
            const headers = columns.map((c: any) => c.label || c.field);

            let csv = headers.join(",") + "\n";
            data.forEach((row: any) => {
                const values = columns.map((c: any) => {
                    const val = row[c.field!] ?? "";
                    return typeof val === "string" ? `"${val}"` : val;
                });
                csv += values.join(",") + "\n";
            });

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="${report.name}-${Date.now()}.csv"`);
            res.send(csv);
        } else {
            res.json(data);
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to export report" });
    }
});

// ==========================================
// PRESET REPORTS
// ==========================================

router.get("/presets/list", async (req: Request, res: Response) => {
    res.json([
        {
            name: "Weekly Hiring Summary",
            type: "hiring",
            dataSource: "applications",
            filters: [{ field: "createdAt", operator: "greater_than", value: "7_days_ago" }],
            columns: [
                { field: "status", label: "Status" },
                { field: "count", label: "Count", format: "number" }
            ],
            groupBy: "status"
        },
        {
            name: "Source Effectiveness",
            type: "candidates",
            dataSource: "candidates",
            columns: [
                { field: "source", label: "Source" },
                { field: "count", label: "Candidates", format: "number" },
                { field: "hired", label: "Hired", format: "number" }
            ],
            groupBy: "source"
        },
        {
            name: "Time to Hire",
            type: "hiring",
            dataSource: "applications",
            filters: [{ field: "status", operator: "equals", value: "hired" }],
            columns: [
                { field: "jobTitle", label: "Job" },
                { field: "avgDays", label: "Avg Days to Hire", format: "number" }
            ],
            groupBy: "jobId"
        },
        {
            name: "Open Positions",
            type: "jobs",
            dataSource: "jobs",
            filters: [{ field: "status", operator: "equals", value: "open" }],
            columns: [
                { field: "title", label: "Position" },
                { field: "department", label: "Department" },
                { field: "applications", label: "Applications", format: "number" },
                { field: "createdAt", label: "Posted", format: "date" }
            ]
        }
    ]);
});

// ==========================================
// AVAILABLE FIELDS
// ==========================================

router.get("/fields/:dataSource", async (req: Request, res: Response) => {
    const fields: Record<string, any[]> = {
        candidates: [
            { field: "_id", label: "ID", type: "string" },
            { field: "name", label: "Name", type: "string" },
            { field: "email", label: "Email", type: "string" },
            { field: "phone", label: "Phone", type: "string" },
            { field: "skills", label: "Skills", type: "array" },
            { field: "experienceYears", label: "Experience (Years)", type: "number" },
            { field: "location", label: "Location", type: "string" },
            { field: "source", label: "Source", type: "string" },
            { field: "status", label: "Status", type: "string" },
            { field: "createdAt", label: "Created At", type: "date" }
        ],
        jobs: [
            { field: "_id", label: "ID", type: "string" },
            { field: "title", label: "Title", type: "string" },
            { field: "department", label: "Department", type: "string" },
            { field: "location", label: "Location", type: "string" },
            { field: "type", label: "Type", type: "string" },
            { field: "status", label: "Status", type: "string" },
            { field: "salaryMin", label: "Min Salary", type: "number" },
            { field: "salaryMax", label: "Max Salary", type: "number" },
            { field: "createdAt", label: "Created At", type: "date" }
        ],
        applications: [
            { field: "_id", label: "ID", type: "string" },
            { field: "status", label: "Status", type: "string" },
            { field: "aiScore", label: "AI Score", type: "number" },
            { field: "appliedAt", label: "Applied At", type: "date" },
            { field: "stage", label: "Stage", type: "string" }
        ]
    };

    res.json(fields[req.params.dataSource] || []);
});

// ==========================================
// HELPER FUNCTION
// ==========================================

async function runReport(reportConfig: any): Promise<any[]> {
    const { dataSource, filters, columns, groupBy, sortBy, aggregations } = reportConfig;

    // Select model
    let Model;
    switch (dataSource) {
        case "candidates": Model = Candidate; break;
        case "jobs": Model = Job; break;
        case "applications": Model = Application; break;
        default: throw new Error(`Unknown data source: ${dataSource}`);
    }

    // Build query
    const query: any = {};
    if (filters) {
        for (const filter of filters) {
            switch (filter.operator) {
                case "equals": query[filter.field] = filter.value; break;
                case "not_equals": query[filter.field] = { $ne: filter.value }; break;
                case "contains": query[filter.field] = { $regex: filter.value, $options: "i" }; break;
                case "greater_than":
                    if (filter.value === "7_days_ago") {
                        query[filter.field] = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
                    } else if (filter.value === "30_days_ago") {
                        query[filter.field] = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
                    } else {
                        query[filter.field] = { $gt: filter.value };
                    }
                    break;
                case "less_than": query[filter.field] = { $lt: filter.value }; break;
                case "in": query[filter.field] = { $in: filter.value }; break;
            }
        }
    }

    // If groupBy, use aggregation
    if (groupBy) {
        const pipeline: any[] = [{ $match: query }];

        pipeline.push({
            $group: {
                _id: `$${groupBy}`,
                count: { $sum: 1 }
            }
        });

        pipeline.push({
            $project: {
                [groupBy]: "$_id",
                count: 1,
                _id: 0
            }
        });

        if (sortBy) {
            pipeline.push({ $sort: { [sortBy.field || "count"]: sortBy.direction === "asc" ? 1 : -1 } });
        }

        return Model.aggregate(pipeline);
    }

    // Regular find query
    let dbQuery = Model.find(query);

    if (columns && columns.length > 0) {
        const projection = columns.reduce((acc: any, col: any) => {
            acc[col.field] = 1;
            return acc;
        }, {});
        dbQuery = dbQuery.select(projection);
    }

    if (sortBy) {
        dbQuery = dbQuery.sort({ [sortBy.field]: sortBy.direction === "asc" ? 1 : -1 });
    }

    return dbQuery.limit(1000).lean();
}

export default router;

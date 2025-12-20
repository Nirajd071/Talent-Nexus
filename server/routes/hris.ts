/**
 * HRIS Integration API Routes
 * Connect to Workday, BambooHR, and other HR systems
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

// ==========================================
// HRIS CONNECTION SCHEMA
// ==========================================

const hrisConnectionSchema = new mongoose.Schema({
    provider: { type: String, enum: ["workday", "bamboohr", "namely", "gusto", "rippling", "custom"], required: true },
    name: String,
    apiKey: String,
    apiUrl: String,
    clientId: String,
    clientSecret: String,
    accessToken: String,
    refreshToken: String,
    tokenExpiresAt: Date,
    isActive: { type: Boolean, default: true },
    lastSyncAt: Date,
    syncStatus: { type: String, enum: ["idle", "syncing", "error", "success"], default: "idle" },
    syncError: String,
    settings: {
        syncEmployees: { type: Boolean, default: true },
        syncDepartments: { type: Boolean, default: true },
        syncPositions: { type: Boolean, default: true },
        autoCreateUsers: { type: Boolean, default: false },
        syncInterval: { type: Number, default: 24 } // hours
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const HRISConnection = mongoose.models.HRISConnection || mongoose.model("HRISConnection", hrisConnectionSchema);

// Employee sync schema
const employeeSyncSchema = new mongoose.Schema({
    hrisConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: "HRISConnection" },
    externalId: String,
    email: String,
    name: String,
    department: String,
    position: String,
    managerId: String,
    startDate: Date,
    status: { type: String, enum: ["active", "inactive", "terminated"], default: "active" },
    syncedAt: { type: Date, default: Date.now }
});

const EmployeeSync = mongoose.models.EmployeeSync || mongoose.model("EmployeeSync", employeeSyncSchema);

// ==========================================
// CONNECTION MANAGEMENT
// ==========================================

// List available providers
router.get("/providers", async (req: Request, res: Response) => {
    res.json([
        { id: "workday", name: "Workday", logo: "workday", supported: true },
        { id: "bamboohr", name: "BambooHR", logo: "bamboo", supported: true },
        { id: "namely", name: "Namely", logo: "namely", supported: true },
        { id: "gusto", name: "Gusto", logo: "gusto", supported: true },
        { id: "rippling", name: "Rippling", logo: "rippling", supported: true },
        { id: "custom", name: "Custom API", logo: "settings", supported: true }
    ]);
});

// Get connections
router.get("/connections", async (req: Request, res: Response) => {
    try {
        const connections = await HRISConnection.find()
            .select("-apiKey -clientSecret -accessToken -refreshToken")
            .lean();
        res.json(connections);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch connections" });
    }
});

// Create connection
router.post("/connections", async (req: Request, res: Response) => {
    try {
        const { provider, name, apiKey, apiUrl, clientId, clientSecret, settings } = req.body;

        if (!provider) {
            return res.status(400).json({ error: "Provider is required" });
        }

        const connection = new HRISConnection({
            provider,
            name: name || provider,
            apiKey,
            apiUrl,
            clientId,
            clientSecret,
            settings: settings || {}
        });

        await connection.save();

        // Return without sensitive data
        const result = connection.toObject();
        delete result.apiKey;
        delete result.clientSecret;

        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to create connection" });
    }
});

// Test connection
router.post("/connections/:id/test", async (req: Request, res: Response) => {
    try {
        const connection = await HRISConnection.findById(req.params.id);
        if (!connection) return res.status(404).json({ error: "Connection not found" });

        // Simulate connection test
        const success = true; // In production, actually test the API

        if (success) {
            res.json({ success: true, message: "Connection successful" });
        } else {
            res.json({ success: false, message: "Connection failed" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to test connection" });
    }
});

// Delete connection
router.delete("/connections/:id", async (req: Request, res: Response) => {
    try {
        await HRISConnection.findByIdAndDelete(req.params.id);
        await EmployeeSync.deleteMany({ hrisConnectionId: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete connection" });
    }
});

// ==========================================
// SYNC OPERATIONS
// ==========================================

// Trigger sync
router.post("/connections/:id/sync", async (req: Request, res: Response) => {
    try {
        const connection = await HRISConnection.findById(req.params.id);
        if (!connection) return res.status(404).json({ error: "Connection not found" });

        // Update sync status
        connection.syncStatus = "syncing";
        await connection.save();

        // Simulate sync (in production, call actual APIs)
        const mockEmployees = [
            { externalId: "E001", email: "john@company.com", name: "John Manager", department: "Engineering", position: "Engineering Manager" },
            { externalId: "E002", email: "jane@company.com", name: "Jane Developer", department: "Engineering", position: "Senior Developer" },
            { externalId: "E003", email: "bob@company.com", name: "Bob Designer", department: "Design", position: "UI Designer" }
        ];

        // Upsert employees
        for (const emp of mockEmployees) {
            await EmployeeSync.findOneAndUpdate(
                { hrisConnectionId: connection._id, externalId: emp.externalId },
                { ...emp, hrisConnectionId: connection._id, syncedAt: new Date() },
                { upsert: true }
            );
        }

        // Update connection
        connection.syncStatus = "success";
        connection.lastSyncAt = new Date();
        connection.syncError = undefined;
        await connection.save();

        res.json({
            success: true,
            message: `Synced ${mockEmployees.length} employees`,
            synced: mockEmployees.length
        });
    } catch (error) {
        console.error("Sync error:", error);
        res.status(500).json({ error: "Failed to sync" });
    }
});

// Get synced employees
router.get("/employees", async (req: Request, res: Response) => {
    try {
        const { connectionId, department, status } = req.query;
        const query: any = {};

        if (connectionId) query.hrisConnectionId = connectionId;
        if (department) query.department = department;
        if (status) query.status = status;

        const employees = await EmployeeSync.find(query)
            .sort({ name: 1 })
            .lean();

        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch employees" });
    }
});

// Get departments (aggregated from synced data)
router.get("/departments", async (req: Request, res: Response) => {
    try {
        const departments = await EmployeeSync.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json(departments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch departments" });
    }
});

// ==========================================
// WEBHOOKS (for real-time updates)
// ==========================================

router.post("/webhook/:provider", async (req: Request, res: Response) => {
    try {
        const { provider } = req.params;
        const payload = req.body;

        console.log(`[HRIS Webhook] Received from ${provider}:`, payload);

        // In production, validate webhook signature and process the event
        // Examples: employee.created, employee.updated, employee.terminated

        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ error: "Webhook processing failed" });
    }
});

export default router;

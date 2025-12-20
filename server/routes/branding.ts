/**
 * White-labeling / Custom Branding API Routes
 * Custom themes, logos, and company branding
 */

import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

// ==========================================
// BRANDING SCHEMA
// ==========================================

const brandingSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId },

    // Basic branding
    companyName: { type: String, default: "TalentOS" },
    logoUrl: String,
    faviconUrl: String,
    tagline: String,

    // Colors
    colors: {
        primary: { type: String, default: "#6366f1" },
        primaryForeground: { type: String, default: "#ffffff" },
        secondary: { type: String, default: "#f4f4f5" },
        accent: { type: String, default: "#8b5cf6" },
        background: { type: String, default: "#ffffff" },
        foreground: { type: String, default: "#09090b" },
        muted: { type: String, default: "#f4f4f5" },
        border: { type: String, default: "#e4e4e7" },
        destructive: { type: String, default: "#ef4444" },
        success: { type: String, default: "#22c55e" },
        warning: { type: String, default: "#f59e0b" }
    },

    // Typography
    fonts: {
        heading: { type: String, default: "Inter" },
        body: { type: String, default: "Inter" }
    },

    // UI Customization
    ui: {
        borderRadius: { type: String, default: "0.5rem" },
        sidebarPosition: { type: String, enum: ["left", "right"], default: "left" },
        showWatermark: { type: Boolean, default: false },
        customCss: String
    },

    // Email branding
    email: {
        fromName: String,
        fromEmail: String,
        headerColor: String,
        footerText: String,
        socialLinks: {
            linkedin: String,
            twitter: String,
            website: String
        }
    },

    // Career page branding
    careerPage: {
        heroTitle: String,
        heroSubtitle: String,
        heroImageUrl: String,
        aboutSection: String,
        benefitsSection: [String],
        showEmployeeCount: { type: Boolean, default: true },
        showOpenPositions: { type: Boolean, default: true }
    },

    // Custom domain
    customDomain: String,
    isVerified: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Branding = mongoose.models.Branding || mongoose.model("Branding", brandingSchema);

// ==========================================
// BRANDING CRUD
// ==========================================

// Get branding settings
router.get("/", async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;

        let branding = await Branding.findOne(organizationId ? { organizationId } : {});

        if (!branding) {
            // Return default branding
            branding = new Branding({});
        }

        res.json(branding);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch branding" });
    }
});

// Update branding
router.put("/", async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;

        const branding = await Branding.findOneAndUpdate(
            organizationId ? { organizationId } : {},
            { ...req.body, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        res.json(branding);
    } catch (error) {
        res.status(500).json({ error: "Failed to update branding" });
    }
});

// Reset to default
router.post("/reset", async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;
        await Branding.findOneAndDelete(organizationId ? { organizationId } : {});
        res.json({ success: true, message: "Branding reset to default" });
    } catch (error) {
        res.status(500).json({ error: "Failed to reset branding" });
    }
});

// ==========================================
// CSS GENERATION
// ==========================================

// Get generated CSS based on branding
router.get("/css", async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;
        const branding = await Branding.findOne(organizationId ? { organizationId } : {});

        const colors = branding?.colors || {};
        const fonts = branding?.fonts || {};
        const ui = branding?.ui || {};

        const css = `
:root {
    --primary: ${colors.primary || "#6366f1"};
    --primary-foreground: ${colors.primaryForeground || "#ffffff"};
    --secondary: ${colors.secondary || "#f4f4f5"};
    --accent: ${colors.accent || "#8b5cf6"};
    --background: ${colors.background || "#ffffff"};
    --foreground: ${colors.foreground || "#09090b"};
    --muted: ${colors.muted || "#f4f4f5"};
    --border: ${colors.border || "#e4e4e7"};
    --destructive: ${colors.destructive || "#ef4444"};
    --success: ${colors.success || "#22c55e"};
    --warning: ${colors.warning || "#f59e0b"};
    --radius: ${ui.borderRadius || "0.5rem"};
    --font-heading: "${fonts.heading || "Inter"}", sans-serif;
    --font-body: "${fonts.body || "Inter"}", sans-serif;
}

body {
    font-family: var(--font-body);
    background-color: var(--background);
    color: var(--foreground);
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
}

${ui.customCss || ""}
`.trim();

        res.setHeader("Content-Type", "text/css");
        res.send(css);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate CSS" });
    }
});

// ==========================================
// LOGO UPLOAD (placeholder - would use cloud storage)
// ==========================================

router.post("/upload-logo", async (req: Request, res: Response) => {
    try {
        // In production, handle file upload to S3/CloudFlare/etc.
        const { logoBase64, type } = req.body;

        if (!logoBase64) {
            return res.status(400).json({ error: "Logo data required" });
        }

        // Simulate upload and return URL
        const mockUrl = `/uploads/branding/${type || "logo"}-${Date.now()}.png`;

        res.json({ url: mockUrl });
    } catch (error) {
        res.status(500).json({ error: "Failed to upload logo" });
    }
});

// ==========================================
// DOMAIN VERIFICATION
// ==========================================

router.post("/verify-domain", async (req: Request, res: Response) => {
    try {
        const { domain, organizationId } = req.body;

        if (!domain) {
            return res.status(400).json({ error: "Domain is required" });
        }

        // In production, verify DNS records
        // For now, simulate verification
        const verificationToken = `talentos-verify-${Date.now()}`;

        res.json({
            domain,
            verificationToken,
            instructions: [
                `Add a TXT record to your DNS with value: ${verificationToken}`,
                "Wait for DNS propagation (up to 24 hours)",
                "Click 'Verify' to confirm domain ownership"
            ]
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to initiate domain verification" });
    }
});

router.post("/confirm-domain", async (req: Request, res: Response) => {
    try {
        const { domain, organizationId } = req.body;

        // In production, check DNS TXT record
        // Simulate successful verification
        await Branding.findOneAndUpdate(
            organizationId ? { organizationId } : {},
            { customDomain: domain, isVerified: true, updatedAt: new Date() },
            { upsert: true }
        );

        res.json({ success: true, message: "Domain verified successfully" });
    } catch (error) {
        res.status(500).json({ error: "Domain verification failed" });
    }
});

// ==========================================
// PREVIEW
// ==========================================

router.get("/preview", async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.query;
        const branding = await Branding.findOne(organizationId ? { organizationId } : {});

        // Generate preview HTML
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${branding?.companyName || "TalentOS"} - Preview</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: ${branding?.fonts?.body || "Inter"}, sans-serif;
            background: ${branding?.colors?.background || "#ffffff"};
            color: ${branding?.colors?.foreground || "#09090b"};
            padding: 40px;
        }
        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 1px solid ${branding?.colors?.border || "#e4e4e7"};
        }
        .logo { height: 40px; }
        h1 {
            font-family: ${branding?.fonts?.heading || "Inter"}, sans-serif;
            color: ${branding?.colors?.foreground || "#09090b"};
        }
        .btn {
            background: ${branding?.colors?.primary || "#6366f1"};
            color: ${branding?.colors?.primaryForeground || "#ffffff"};
            padding: 12px 24px;
            border: none;
            border-radius: ${branding?.ui?.borderRadius || "0.5rem"};
            cursor: pointer;
            margin-top: 16px;
        }
        .card {
            background: ${branding?.colors?.secondary || "#f4f4f5"};
            padding: 24px;
            border-radius: ${branding?.ui?.borderRadius || "0.5rem"};
            margin-top: 24px;
        }
    </style>
</head>
<body>
    <div class="header">
        ${branding?.logoUrl ? `<img src="${branding.logoUrl}" class="logo" alt="Logo">` : ""}
        <h1>${branding?.companyName || "TalentOS"}</h1>
    </div>
    <p>${branding?.tagline || "Your AI-Powered Hiring Platform"}</p>
    <button class="btn">Primary Button</button>
    <div class="card">
        <h2>Sample Card</h2>
        <p>This is how cards will appear with your branding.</p>
    </div>
</body>
</html>`.trim();

        res.setHeader("Content-Type", "text/html");
        res.send(html);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate preview" });
    }
});

export default router;

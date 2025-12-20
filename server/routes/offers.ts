/**
 * Offer Management API Routes
 * Phase 2C.1: Offer Workflow
 */

import { Router, Request, Response } from "express";
import { Offer, Candidate, Job, User } from "../db";
import nodemailer from "nodemailer";

const router = Router();

// Email transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// ==========================================
// OFFER CRUD
// ==========================================

// List offers (with filters)
router.get("/", async (req: Request, res: Response) => {
    try {
        const { status, candidateId, limit = 50 } = req.query;

        const query: any = {};
        if (status && status !== "all") query.status = status;
        if (candidateId) query.candidateId = candidateId;

        const offers = await Offer.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .lean();

        res.json(offers);
    } catch (error) {
        console.error("List offers error:", error);
        res.status(500).json({ error: "Failed to fetch offers" });
    }
});

// Get offer by ID
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const offer = await Offer.findById(req.params.id).lean();
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }
        res.json(offer);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch offer" });
    }
});

// Create new offer
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            candidateId,
            candidateName,
            candidateEmail,
            jobId,
            role,
            department,
            baseSalary,
            bonus,
            equity,
            startDate,
            expiresAt,
            approvalChain,
            notes
        } = req.body;

        if (!candidateName || !candidateEmail) {
            return res.status(400).json({ error: "Candidate name and email are required" });
        }

        const offer = new Offer({
            candidateId,
            candidateName,
            candidateEmail,
            jobId,
            role,
            department,
            baseSalary,
            bonus,
            equity,
            startDate,
            expiresAt,
            approvalChain: approvalChain || [],
            status: approvalChain?.length > 0 ? "pending_approval" : "draft"
        });

        await offer.save();

        res.status(201).json({
            message: "Offer created successfully",
            offer
        });
    } catch (error) {
        console.error("Create offer error:", error);
        res.status(500).json({ error: "Failed to create offer" });
    }
});

// Update offer
router.put("/:id", async (req: Request, res: Response) => {
    try {
        const offer = await Offer.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { new: true }
        );

        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }
        res.json(offer);
    } catch (error) {
        res.status(500).json({ error: "Failed to update offer" });
    }
});

// Delete offer
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await Offer.findByIdAndDelete(req.params.id);
        res.json({ message: "Offer deleted" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete offer" });
    }
});

// ==========================================
// APPROVAL WORKFLOW
// ==========================================

// Approve offer (by approver)
router.post("/:id/approve", async (req: Request, res: Response) => {
    try {
        const { approverId, approverName, notes } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        // Find the pending approver and approve
        const approvalChain = offer.approvalChain || [];
        let allApproved = true;
        let foundPending = false;

        for (const approver of approvalChain) {
            if (approver.status === "pending" || approver.status === "waiting") {
                if (!foundPending) {
                    approver.status = "approved";
                    approver.date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    foundPending = true;

                    // Set next approver to pending
                    const nextIdx = approvalChain.indexOf(approver) + 1;
                    if (nextIdx < approvalChain.length) {
                        approvalChain[nextIdx].status = "pending";
                    }
                } else {
                    allApproved = false;
                }
            }
        }

        // If all approved, update offer status
        if (allApproved && foundPending) {
            offer.status = "approved";
        }

        offer.approvalChain = approvalChain;
        await offer.save();

        res.json({
            message: allApproved ? "Offer fully approved" : "Approval recorded",
            offer,
            allApproved
        });
    } catch (error) {
        console.error("Approve offer error:", error);
        res.status(500).json({ error: "Failed to approve offer" });
    }
});

// Reject offer
router.post("/:id/reject", async (req: Request, res: Response) => {
    try {
        const { approverId, approverName, reason } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        // Mark current pending approver as rejected
        const approvalChain = offer.approvalChain || [];
        for (const approver of approvalChain) {
            if (approver.status === "pending") {
                approver.status = "rejected";
                approver.date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
                break;
            }
        }

        offer.status = "draft"; // Reset to draft for revisions
        offer.approvalChain = approvalChain;
        await offer.save();

        res.json({ message: "Offer rejected", offer });
    } catch (error) {
        res.status(500).json({ error: "Failed to reject offer" });
    }
});

// ==========================================
// SEND OFFER
// ==========================================

// Send offer to candidate
router.post("/:id/send", async (req: Request, res: Response) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        if (offer.status !== "approved" && offer.status !== "draft") {
            return res.status(400).json({ error: "Offer must be approved before sending" });
        }

        // Generate offer URL
        const offerUrl = `${process.env.APP_URL || "http://localhost:5000"}/candidate/offer/${offer._id}`;

        const formattedSalary = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(offer.baseSalary || 0);

        const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin-top: 10px;">You've received an offer</p>
            </div>
            
            <div style="padding: 40px;">
                <p style="font-size: 16px; color: #374151;">Dear ${offer.candidateName},</p>
                
                <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                    We are thrilled to extend an official offer to join our team as <strong>${offer.role || "Team Member"}</strong>.
                </p>
                
                <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">Offer Details</h2>
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Position</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #1f2937; text-align: right;">${offer.role || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Department</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #1f2937; text-align: right;">${offer.department || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Base Salary</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #059669; text-align: right;">${formattedSalary}/year</td>
                        </tr>
                        ${offer.bonus ? `<tr>
                            <td style="padding: 8px 0; color: #6b7280;">Signing Bonus</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #1f2937; text-align: right;">$${offer.bonus.toLocaleString()}</td>
                        </tr>` : ""}
                        ${offer.equity ? `<tr>
                            <td style="padding: 8px 0; color: #6b7280;">Equity</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #1f2937; text-align: right;">${offer.equity}</td>
                        </tr>` : ""}
                        <tr>
                            <td style="padding: 8px 0; color: #6b7280;">Start Date</td>
                            <td style="padding: 8px 0; font-weight: 600; color: #1f2937; text-align: right;">${offer.startDate || "TBD"}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${offerUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        View Full Offer & Respond
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; text-align: center;">
                    ${offer.expiresAt ? `This offer expires on ${offer.expiresAt}` : "Please respond at your earliest convenience"}
                </p>
            </div>
        </div>
        `;

        // Send email
        try {
            await transporter.sendMail({
                from: process.env.GMAIL_USER,
                to: offer.candidateEmail,
                subject: `🎉 Your Offer from Our Company - ${offer.role}`,
                html
            });
        } catch (emailError) {
            console.error("Failed to send offer email:", emailError);
        }

        // Update offer status
        offer.status = "sent";
        await offer.save();

        res.json({
            message: "Offer sent successfully",
            offer
        });
    } catch (error) {
        console.error("Send offer error:", error);
        res.status(500).json({ error: "Failed to send offer" });
    }
});

// ==========================================
// CANDIDATE ACTIONS
// ==========================================

// Get offer for candidate (public-ish route)
router.get("/candidate/:offerId", async (req: Request, res: Response) => {
    try {
        const offer = await Offer.findById(req.params.offerId).lean();
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        // Return limited data for candidate view
        res.json({
            _id: offer._id,
            candidateName: offer.candidateName,
            role: offer.role,
            department: offer.department,
            baseSalary: offer.baseSalary,
            bonus: offer.bonus,
            equity: offer.equity,
            startDate: offer.startDate,
            expiresAt: offer.expiresAt,
            status: offer.status
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch offer" });
    }
});

// Accept offer
router.post("/:id/accept", async (req: Request, res: Response) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        offer.status = "accepted";
        offer.signedAt = new Date().toISOString();
        await offer.save();

        res.json({
            message: "Offer accepted! Welcome to the team!",
            offer
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to accept offer" });
    }
});

// Decline offer
router.post("/:id/decline", async (req: Request, res: Response) => {
    try {
        const { reason } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        offer.status = "declined";
        await offer.save();

        res.json({
            message: "Offer declined",
            offer
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to decline offer" });
    }
});

// Negotiate offer
router.post("/:id/negotiate", async (req: Request, res: Response) => {
    try {
        const { message, requestedChanges } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ error: "Offer not found" });
        }

        offer.status = "negotiating";
        await offer.save();

        res.json({
            message: "Negotiation request submitted",
            offer
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to submit negotiation" });
    }
});

// ==========================================
// ANALYTICS
// ==========================================

// Get offer analytics
router.get("/analytics/summary", async (req: Request, res: Response) => {
    try {
        const total = await Offer.countDocuments();
        const accepted = await Offer.countDocuments({ status: "accepted" });
        const declined = await Offer.countDocuments({ status: "declined" });
        const pending = await Offer.countDocuments({ status: { $in: ["sent", "pending_approval"] } });
        const negotiating = await Offer.countDocuments({ status: "negotiating" });

        const acceptanceRate = total > 0 ? Math.round((accepted / (accepted + declined)) * 100) : 0;

        res.json({
            total,
            accepted,
            declined,
            pending,
            negotiating,
            acceptanceRate
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});

export default router;

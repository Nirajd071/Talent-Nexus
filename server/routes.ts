import type { Express } from "express";
import { type Server } from "http";
import { connectDB } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Connect to MongoDB
  await connectDB();

  // Main API Routes (MongoDB-backed)
  const apiRoutes = (await import("./routes/api")).default;
  app.use("/api", apiRoutes);

  // Assessment Routes
  const assessmentRoutes = (await import("./routes/assessments")).default;
  app.use("/api/assessments", assessmentRoutes);

  // Interview Scheduling Routes
  const interviewRoutes = (await import("./routes/interviews")).default;
  app.use("/api/interviews", interviewRoutes);

  // Offer Management Routes
  const offerRoutes = (await import("./routes/offers")).default;
  app.use("/api/offers", offerRoutes);

  // Onboarding Routes
  const onboardingRoutes = (await import("./routes/onboarding")).default;
  app.use("/api/onboarding", onboardingRoutes);

  // Analytics Routes
  const analyticsRoutes = (await import("./routes/analytics")).default;
  app.use("/api/analytics", analyticsRoutes);

  // Email Campaigns Routes
  const emailRoutes = (await import("./routes/emails")).default;
  app.use("/api/emails", emailRoutes);

  // Real-Time Notifications Routes
  const notificationRoutes = (await import("./routes/notifications")).default;
  app.use("/api/notifications", notificationRoutes);

  // Employee Referrals Routes
  const referralRoutes = (await import("./routes/referrals")).default;
  app.use("/api/referrals", referralRoutes);

  // Team Collaboration Routes
  const collaborationRoutes = (await import("./routes/collaboration")).default;
  app.use("/api/collaboration", collaborationRoutes);

  // Bulk Import/Export Routes
  const bulkRoutes = (await import("./routes/bulk-operations")).default;
  app.use("/api/bulk", bulkRoutes);

  // AI Automation Routes
  const aiRoutes = (await import("./routes/ai-automation")).default;
  app.use("/api/ai", aiRoutes);

  // Calendar Integration Routes
  const calendarRoutes = (await import("./routes/calendar")).default;
  app.use("/api/calendar", calendarRoutes);

  // Job Board Integration Routes
  const jobBoardRoutes = (await import("./routes/job-boards")).default;
  app.use("/api/job-boards", jobBoardRoutes);

  // Candidate Comparison Routes
  const comparisonRoutes = (await import("./routes/comparison")).default;
  app.use("/api/comparison", comparisonRoutes);

  // HRIS Integration Routes
  const hrisRoutes = (await import("./routes/hris")).default;
  app.use("/api/hris", hrisRoutes);

  // Slack/Teams Bot Integration Routes
  const botRoutes = (await import("./routes/bot-integration")).default;
  app.use("/api/bots", botRoutes);

  // White-labeling/Branding Routes
  const brandingRoutes = (await import("./routes/branding")).default;
  app.use("/api/branding", brandingRoutes);

  // Automation (Tags, Templates, Workflows) Routes
  const automationRoutes = (await import("./routes/automation")).default;
  app.use("/api/automation", automationRoutes);

  // Custom Reports Builder Routes
  const reportsRoutes = (await import("./routes/reports")).default;
  app.use("/api/reports", reportsRoutes);

  return httpServer;
}

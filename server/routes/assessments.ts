/**
 * Assessment API Routes
 * Handles test creation, assignment, and management
 */

import { Router, Request, Response } from "express";
import { Assessment, TestAssignment, User } from "../db";
import { sendOTPViaGmail } from "../services/gmail";
import crypto from "crypto";
import AI from "../services/ai";

const router = Router();

// ==========================================
// AI GENERATION
// ==========================================

// Generate assessment content using AI
router.post("/generate", async (req: Request, res: Response) => {
    try {
        const { title, type, difficulty, language } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }

        const prompt = `Create a professional assessment description for a ${difficulty || 'medium'} level ${type || 'coding'} test.

Assessment Title: "${title}"
${language ? `Programming Language: ${language}` : ''}
Type: ${type || 'coding'}
Difficulty: ${difficulty || 'medium'}

Generate a JSON response with:
1. description - A professional 2-3 sentence description of what this assessment evaluates
2. timeLimit - Recommended time limit in minutes based on complexity
3. suggestedQuestionCount - Number of questions to include

Return ONLY valid JSON:
{
  "description": "Professional assessment description...",
  "timeLimit": 60,
  "suggestedQuestionCount": 5
}`;

        const aiResponse = await AI.callAI("email", prompt);
        const response = aiResponse.content;

        // Parse JSON from response
        let generated;
        try {
            const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            generated = JSON.parse(cleanResponse);
        } catch (parseError) {
            console.error("Failed to parse AI response:", response);
            return res.status(500).json({ error: "Failed to parse AI response" });
        }

        res.json(generated);
    } catch (error) {
        console.error("AI generate assessment error:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
});

// ==========================================
// ASSESSMENT CRUD (Recruiter)
// ==========================================

// Get all assessments
router.get("/", async (req: Request, res: Response) => {
    try {
        const assessments = await Assessment.find({ isActive: true })
            .sort({ createdAt: -1 })
            .lean();
        res.json(assessments);
    } catch (error) {
        console.error("Get assessments error:", error);
        res.status(500).json({ error: "Failed to fetch assessments" });
    }
});

// Get single assessment
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const assessment = await Assessment.findById(req.params.id).lean();
        if (!assessment) {
            return res.status(404).json({ error: "Assessment not found" });
        }
        res.json(assessment);
    } catch (error) {
        console.error("Get assessment error:", error);
        res.status(500).json({ error: "Failed to fetch assessment" });
    }
});

// Create assessment
router.post("/", async (req: Request, res: Response) => {
    try {
        const assessment = new Assessment(req.body);
        await assessment.save();
        res.status(201).json(assessment);
    } catch (error) {
        console.error("Create assessment error:", error);
        res.status(500).json({ error: "Failed to create assessment" });
    }
});

// Update assessment
router.put("/:id", async (req: Request, res: Response) => {
    try {
        console.log("UPDATE ASSESSMENT:", req.params.id, "Body:", JSON.stringify(req.body));
        const updateData = { ...req.body, updatedAt: new Date() };

        // If questions are provided as IDs, we need to fetch the full question objects
        if (req.body.questions && Array.isArray(req.body.questions)) {
            const questionIds = req.body.questions;
            console.log("Question IDs received:", questionIds);

            // Check if questions are IDs (strings) or already objects
            if (questionIds.length > 0 && typeof questionIds[0] === 'string') {
                // Import Question model dynamically
                const { Question } = await import("../db");

                // Fetch full question objects
                const fullQuestions = await Question.find({
                    _id: { $in: questionIds }
                }).lean();

                console.log("Full questions fetched:", fullQuestions.length);

                // Convert to the EXACT format expected by Assessment schema
                // Schema: {id, type, question, options:[String], correctAnswer, points, timeLimit, codeLanguage, testCases, rubric}
                updateData.questions = fullQuestions.map(q => ({
                    id: q._id.toString(),
                    type: q.type === 'coding' ? 'coding' : q.type === 'mcq' ? 'mcq' : q.type === 'aptitude' ? 'mcq' : 'open_ended',
                    question: q.title + (q.description ? '\n\n' + q.description : ''),
                    options: q.options?.map((o: any) => typeof o === 'string' ? o : o.text) || [],
                    correctAnswer: q.options?.find((o: any) => o.isCorrect)?.text || '',
                    points: q.points || 10,
                    timeLimit: q.timeLimit,
                    codeLanguage: q.allowedLanguages?.[0] || '',
                    testCases: q.testCases?.map((tc: any) => ({
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                        hidden: tc.isHidden || false
                    })) || [],
                    rubric: ''
                }));
            }
        }

        const assessment = await Assessment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );
        if (!assessment) {
            return res.status(404).json({ error: "Assessment not found" });
        }
        console.log("Assessment updated with", assessment.questions?.length, "questions");
        res.json(assessment);
    } catch (error: any) {
        console.error("Update assessment error:", error);
        res.status(500).json({ error: error.message || "Failed to update assessment" });
    }
});

// Delete assessment (soft delete)
router.delete("/:id", async (req: Request, res: Response) => {
    try {
        await Assessment.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: "Assessment deleted" });
    } catch (error) {
        console.error("Delete assessment error:", error);
        res.status(500).json({ error: "Failed to delete assessment" });
    }
});

// Duplicate assessment
router.post("/:id/duplicate", async (req: Request, res: Response) => {
    try {
        const original = await Assessment.findById(req.params.id).lean();
        if (!original) {
            return res.status(404).json({ error: "Assessment not found" });
        }

        const duplicate = new Assessment({
            ...original,
            _id: undefined,
            title: `${original.title} (Copy)`,
            completions: 0,
            avgScore: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await duplicate.save();
        res.status(201).json(duplicate);
    } catch (error) {
        console.error("Duplicate assessment error:", error);
        res.status(500).json({ error: "Failed to duplicate assessment" });
    }
});

// ==========================================
// TEST ASSIGNMENT
// ==========================================

// Assign test to candidates
router.post("/:id/assign", async (req: Request, res: Response) => {
    try {
        const { candidateIds, deadline, sendNotification = true } = req.body;
        const assessmentId = req.params.id;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ error: "Assessment not found" });
        }

        const assignments = [];
        const errors = [];

        for (const candidateId of candidateIds) {
            try {
                // Check if already assigned
                const existing = await TestAssignment.findOne({
                    assessmentId,
                    candidateId,
                    status: { $in: ["assigned", "in_progress"] }
                });

                if (existing) {
                    errors.push({ candidateId, error: "Already assigned" });
                    continue;
                }

                // Get candidate info
                const candidate = await User.findById(candidateId);
                if (!candidate) {
                    errors.push({ candidateId, error: "Candidate not found" });
                    continue;
                }

                // Generate unique test URL
                const testToken = crypto.randomBytes(16).toString("hex");
                const testUrl = `/assessment/${testToken}`;

                // Create assignment
                const assignment = new TestAssignment({
                    assessmentId,
                    candidateId,
                    candidateEmail: candidate.email,
                    candidateName: candidate.profile?.firstName
                        ? `${candidate.profile.firstName} ${candidate.profile.lastName || ""}`
                        : candidate.email,
                    deadline: deadline ? new Date(deadline) : null,
                    testUrl,
                    notificationSent: false
                });
                await assignment.save();
                assignments.push(assignment);

                // Send notification email
                if (sendNotification && candidate.email) {
                    try {
                        await sendAssignmentEmail(candidate.email, assessment.title, testUrl, deadline);
                        assignment.notificationSent = true;
                        await assignment.save();
                    } catch (emailError) {
                        console.error("Failed to send assignment email:", emailError);
                    }
                }
            } catch (err) {
                console.error("Assignment error for candidate:", candidateId, err);
                errors.push({ candidateId, error: "Failed to assign" });
            }
        }

        res.json({
            message: `Assigned to ${assignments.length} candidate(s)`,
            assignments,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error("Assign test error:", error);
        res.status(500).json({ error: "Failed to assign test" });
    }
});

// Get assignments for an assessment
router.get("/:id/assignments", async (req: Request, res: Response) => {
    try {
        const assignments = await TestAssignment.find({ assessmentId: req.params.id })
            .populate("assessmentId", "title type timeLimit questions") // Include questions for review
            .sort({ createdAt: -1 })
            .lean();
        res.json(assignments);
    } catch (error) {
        console.error("Get assignments error:", error);
        res.status(500).json({ error: "Failed to fetch assignments" });
    }
});

// ==========================================
// CANDIDATE-FACING ROUTES
// ==========================================

// Get assigned tests for candidate
router.get("/candidate/assigned", async (req: Request, res: Response) => {
    try {
        const candidateEmail = req.query.email as string;
        if (!candidateEmail) {
            return res.status(400).json({ error: "Email required" });
        }

        // First, find all completed assessments for this candidate
        const completedAssignments = await TestAssignment.find({
            candidateEmail: candidateEmail.toLowerCase(),
            status: "completed"
        }).lean();

        const completedAssessmentIds = new Set(
            completedAssignments.map(a => a.assessmentId?.toString())
        );

        // Query TestAssignment by candidateEmail directly (more reliable)
        const assignments = await TestAssignment.find({
            candidateEmail: candidateEmail.toLowerCase(),
            status: { $in: ["assigned", "in_progress"] }
        })
            .populate("assessmentId")
            .sort({ createdAt: -1 })
            .lean();

        // Filter out assessments that are already completed AND deduplicate
        const seen = new Set<string>();
        const uniqueAssignments = assignments.filter(assignment => {
            const assessmentId = assignment.assessmentId?._id?.toString() || assignment.assessmentId?.toString();
            if (!assessmentId || seen.has(assessmentId)) {
                return false;
            }
            // Skip if this assessment is already completed
            if (completedAssessmentIds.has(assessmentId)) {
                return false;
            }
            seen.add(assessmentId);
            return true;
        });

        console.log(`Found ${assignments.length} pending, ${completedAssignments.length} completed, ${uniqueAssignments.length} unique pending for ${candidateEmail}`);
        res.json(uniqueAssignments);
    } catch (error) {
        console.error("Get candidate assignments error:", error);
        res.status(500).json({ error: "Failed to fetch assignments" });
    }
});

// Get completed tests for candidate
router.get("/candidate/completed", async (req: Request, res: Response) => {
    try {
        const candidateEmail = req.query.email as string;
        if (!candidateEmail) {
            return res.status(400).json({ error: "Email required" });
        }

        const completedAssignments = await TestAssignment.find({
            candidateEmail: candidateEmail.toLowerCase(),
            status: "completed"
        })
            .populate("assessmentId")
            .sort({ completedAt: -1 })
            .lean();

        console.log(`Found ${completedAssignments.length} completed for ${candidateEmail}`);
        res.json(completedAssignments);
    } catch (error) {
        console.error("Get completed assignments error:", error);
        res.status(500).json({ error: "Failed to fetch completed assignments" });
    }
});

// Start a test (update status to in_progress)
router.post("/candidate/start/:assignmentId", async (req: Request, res: Response) => {
    try {
        const assignment = await TestAssignment.findById(req.params.assignmentId);
        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        if (assignment.status !== "assigned") {
            return res.status(400).json({ error: "Test already started or completed" });
        }

        assignment.status = "in_progress";
        assignment.startedAt = new Date();
        await assignment.save();

        // Get full assessment details
        const assessment = await Assessment.findById(assignment.assessmentId);

        res.json({
            assignment,
            assessment
        });
    } catch (error) {
        console.error("Start test error:", error);
        res.status(500).json({ error: "Failed to start test" });
    }
});

// Submit test
router.post("/candidate/submit/:assignmentId", async (req: Request, res: Response) => {
    try {
        const { answers, timeTaken, proctoringEvents } = req.body;
        const assignment = await TestAssignment.findById(req.params.assignmentId);

        if (!assignment) {
            return res.status(404).json({ error: "Assignment not found" });
        }

        // Update assignment
        assignment.status = "completed";
        assignment.completedAt = new Date();

        // Calculate basic score (AI evaluation will enhance this)
        const assessment = await Assessment.findById(assignment.assessmentId);
        if (assessment) {
            let score = 0;
            let totalPoints = 0;
            const processedAnswers: any[] = [];

            for (let i = 0; i < assessment.questions.length; i++) {
                const q = assessment.questions[i];
                totalPoints += q.points || 10;
                const answer = answers[q.id] || answers[i];
                const isCorrect = q.type === "mcq" && answer === q.correctAnswer;

                if (isCorrect) {
                    score += q.points || 10;
                }

                // Store answer with question details for review
                processedAnswers.push({
                    questionId: q.id || q._id,
                    questionIndex: i,
                    questionTitle: q.question?.substring(0, 100) || `Question ${i + 1}`,
                    questionType: q.type,
                    answer: answer,
                    selectedOption: q.type === "mcq" ? answer : undefined,
                    textAnswer: q.type === "open_ended" ? answer : undefined,
                    code: q.type === "coding" ? answer : undefined,
                    score: isCorrect ? (q.points || 10) : 0,
                    maxScore: q.points || 10,
                    isCorrect: q.type === "mcq" ? isCorrect : undefined
                });
            }

            assignment.score = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
            assignment.answers = processedAnswers;

            // Update assessment stats
            assessment.completions = (assessment.completions || 0) + 1;
            assessment.avgScore = assessment.avgScore
                ? Math.round((assessment.avgScore * (assessment.completions - 1) + assignment.score) / assessment.completions)
                : assignment.score;
            await assessment.save();
        }

        // Store proctoring data
        if (proctoringEvents && proctoringEvents.length > 0) {
            const flags = proctoringEvents.filter((e: any) => e.severity !== "low");
            assignment.proctoringReport = {
                flags,
                overallIntegrity: 100 - (flags.length * 5) // Simple calculation
            };
            assignment.integrityScore = assignment.proctoringReport.overallIntegrity;
        }

        await assignment.save();

        res.json({
            message: "Test submitted successfully",
            score: assignment.score,
            integrityScore: assignment.integrityScore
        });
    } catch (error) {
        console.error("Submit test error:", error);
        res.status(500).json({ error: "Failed to submit test" });
    }
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function sendAssignmentEmail(email: string, testTitle: string, testUrl: string, deadline: string | null) {
    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 20px; color: #1f2937; margin: 0;">📝 New Assessment Assigned</h1>
        </div>
        
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="font-size: 16px; color: #374151; margin: 0 0 8px;">${testTitle}</h2>
            ${deadline ? `<p style="color: #6b7280; font-size: 14px; margin: 0;">Due: ${new Date(deadline).toLocaleDateString()}</p>` : ""}
        </div>
        
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">
            You've been assigned a new assessment. Please complete it before the deadline.
        </p>
        
        <div style="text-align: center; margin: 24px 0;">
            <a href="http://localhost:5000${testUrl}" style="background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; display: inline-block;">
                Start Assessment →
            </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            TalentOS - AI-Powered Hiring Platform
        </p>
    </div>
    `;

    // Use existing gmail service
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });

    await transporter.sendMail({
        from: `"TalentOS" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: `📝 New Assessment: ${testTitle}`,
        html
    });
}

export default router;

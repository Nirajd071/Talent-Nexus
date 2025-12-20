/**
 * Gmail SMTP Service for OTP
 * Uses Nodemailer with Gmail App Password
 */

import nodemailer from "nodemailer";

// Gmail SMTP Configuration from environment variables
const GMAIL_USER = process.env.GMAIL_USER || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";

// Create Gmail transporter with secure settings
const createTransporter = () => {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.log("⚠️ Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env");
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD,
        },
    });
};

// Send OTP via Gmail
export async function sendOTPViaGmail(to: string, otp: string): Promise<{ success: boolean }> {
    const transporter = createTransporter();

    if (!transporter) {
        console.log(`📧 [DEMO MODE] OTP for ${to}: ${otp}`);
        return { success: false };
    }

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
                <span style="font-size: 28px;">💼</span>
            </div>
            <h1 style="margin: 16px 0 8px; font-size: 24px; color: #1f2937;">TalentOS</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Recruiter Login Verification</p>
        </div>
        
        <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">Your verification code is:</p>
            <div style="font-size: 42px; font-weight: bold; letter-spacing: 10px; color: #1f2937; font-family: 'Courier New', monospace; background: white; padding: 16px; border-radius: 8px; display: inline-block;">
                ${otp}
            </div>
            <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
                ⏱️ This code expires in <strong>10 minutes</strong>
            </p>
        </div>
        
        <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 0;">
            If you didn't request this code, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
            © 2024 TalentOS - AI-Powered Talent Acquisition
        </p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"TalentOS" <${GMAIL_USER}>`,
            to,
            subject: "🔐 Your TalentOS Login Code",
            html,
            text: `Your TalentOS verification code is: ${otp}. This code expires in 10 minutes.`,
        });

        console.log(`✅ OTP email sent to ${to} via Gmail`);
        return { success: true };
    } catch (error) {
        console.error("❌ Gmail send error:", error);
        return { success: false };
    }
}

export default { sendOTPViaGmail };

// Send Assessment Invitation Email
export async function sendAssessmentInvite(
    to: string,
    candidateName: string,
    testTitle: string,
    accessCode: string,
    deadline?: Date,
    testUrl?: string
): Promise<{ success: boolean }> {
    const transporter = createTransporter();

    if (!transporter) {
        console.log(`📧 [DEMO MODE] Assessment invite for ${to}: Code ${accessCode}`);
        return { success: false };
    }

    const formattedDeadline = deadline
        ? new Date(deadline).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        : 'No specific deadline';

    const portalUrl = testUrl || `${process.env.APP_URL || 'http://localhost:5000'}/candidate`;

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
                <span style="font-size: 28px;">📋</span>
            </div>
            <h1 style="margin: 16px 0 8px; font-size: 24px; color: #1f2937;">Assessment Invitation</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">You've been invited to take an assessment</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">
                Hello <strong>${candidateName}</strong>,
            </p>
            <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
                You have been invited to complete the following assessment:
            </p>
            <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h2 style="margin: 0 0 8px; font-size: 18px; color: #1e40af;">🎯 ${testTitle}</h2>
                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                    📅 Complete by: <strong>${formattedDeadline}</strong>
                </p>
            </div>
        </div>
        
        <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 12px;">Your Access Code:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: white; font-family: 'Courier New', monospace; background: rgba(255,255,255,0.1); padding: 16px 24px; border-radius: 8px; display: inline-block; border: 2px dashed rgba(255,255,255,0.3);">
                ${accessCode}
            </div>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 16px 0 0;">
                🔒 This code is unique to you. Do not share it.
            </p>
        </div>
        
        <div style="text-align: center; margin-bottom: 24px;">
            <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                🚀 Start Assessment
            </a>
        </div>
        
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 13px; margin: 0;">
                <strong>⚠️ Before you begin:</strong><br>
                • Find a quiet place with stable internet<br>
                • Ensure your webcam and microphone work<br>
                • Keep the browser in fullscreen mode<br>
                • Do not switch tabs during the test
            </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #9ca3af; font-size: 11px; text-align: center; margin: 0;">
            © 2024 TalentOS - AI-Powered Talent Acquisition<br>
            If you didn't expect this email, please ignore it.
        </p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"TalentOS Assessments" <${GMAIL_USER}>`,
            to,
            subject: `📋 Assessment Invitation: ${testTitle}`,
            html,
            text: `Hello ${candidateName}, you've been invited to complete the assessment "${testTitle}". Your access code is: ${accessCode}. Complete by: ${formattedDeadline}. Start here: ${portalUrl}`,
        });

        console.log(`✅ Assessment invite sent to ${to}`);
        return { success: true };
    } catch (error) {
        console.error("❌ Assessment invite email error:", error);
        return { success: false };
    }
}

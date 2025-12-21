/**
 * Email Service - Nodemailer Integration
 * Handles all email communications for TalentOS using Gmail SMTP
 */

import nodemailer from "nodemailer";

// Gmail SMTP Configuration using App Password from .env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "nirajdas6664521@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD || ""
  }
});

const FROM_EMAIL = process.env.GMAIL_USER || "nirajdas6664521@gmail.com";
const FROM_NAME = "TalentOS";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// ==========================================
// CORE EMAIL FUNCTION
// ==========================================

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const result = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`Email sent successfully to ${options.to}: ${result.messageId}`);
    return { success: true, id: result.messageId };
  } catch (error: any) {
    console.error("Email send error:", error);
    return { success: false, error: error.message };
  }
}

// ==========================================
// SHORTLIST EMAIL WITH ASSESSMENT CODE
// ==========================================

export async function sendShortlistEmail(
  candidateEmail: string,
  candidateName: string,
  details: {
    jobTitle: string;
  }
): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">You've been shortlisted!</p>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">Dear ${candidateName},</p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          We are pleased to inform you that you have been <strong>shortlisted</strong> for the 
          <strong>${details.jobTitle}</strong> position at TalentOS!
        </p>
        
        <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #10b981; text-align: center;">
          <h3 style="margin: 0 0 16px; color: #1f2937;">🌟 Great News!</h3>
          <p style="color: #4b5563; line-height: 1.6; margin: 0;">
            Your profile stood out among many applicants. Our hiring team was impressed with your qualifications 
            and experience. We will be reaching out to you soon with the next steps in our hiring process.
          </p>
        </div>
        
        <p style="color: #4b5563; line-height: 1.6;">
          In the meantime, feel free to explore more about our company and the exciting work we do. 
          If you have any questions, please don't hesitate to reply to this email.
        </p>
        
        <p style="color: #4b5563; margin-top: 24px;">
          Best regards,<br/>
          <strong>The TalentOS Recruitment Team</strong>
        </p>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; background: #f3f4f6;">
        TalentOS - AI-Powered Hiring Platform<br/>
        We're excited to have you in our talent pipeline!
      </div>
    </div>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `🎉 Congratulations! You're Shortlisted for ${details.jobTitle}`,
    html,
    text: `Dear ${candidateName}, Congratulations! You've been shortlisted for ${details.jobTitle} at TalentOS. We will reach out to you soon with the next steps. Best regards, The TalentOS Team`
  });
}

// ==========================================
// INTERVIEW INVITATION
// ==========================================

export async function sendInterviewInvite(
  candidateEmail: string,
  candidateName: string,
  interviewDetails: {
    jobTitle: string;
    date: string;
    time: string;
    duration: string;
    type: string;
    meetingLink?: string;
    interviewerName?: string;
  }
): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Interview Invitation</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <p>Dear ${candidateName},</p>
        <p>You have been invited for an interview for the <strong>${interviewDetails.jobTitle}</strong> position.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Date:</strong> ${interviewDetails.date}</p>
          <p><strong>Time:</strong> ${interviewDetails.time}</p>
          <p><strong>Duration:</strong> ${interviewDetails.duration}</p>
          <p><strong>Type:</strong> ${interviewDetails.type}</p>
          ${interviewDetails.interviewerName ? `<p><strong>Interviewer:</strong> ${interviewDetails.interviewerName}</p>` : ""}
        </div>
        ${interviewDetails.meetingLink ? `
          <div style="margin-top: 20px; text-align: center;">
            <a href="${interviewDetails.meetingLink}" style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Join Interview
            </a>
          </div>
        ` : ""}
      </div>
      <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
        TalentOS - AI-Powered Hiring Platform
      </div>
    </div>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `Interview Invitation: ${interviewDetails.jobTitle}`,
    html
  });
}

// ==========================================
// STATUS UPDATE EMAIL
// ==========================================

export async function sendStatusUpdate(
  candidateEmail: string,
  candidateName: string,
  status: string,
  jobTitle: string,
  nextSteps?: string
): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
      <h2>Application Update</h2>
      <p>Dear ${candidateName},</p>
      <p>Your application for <strong>${jobTitle}</strong> has been updated.</p>
      <p><strong>New Status:</strong> ${status}</p>
      ${nextSteps ? `<p><strong>Next Steps:</strong> ${nextSteps}</p>` : ""}
      <p>Best regards,<br/>The TalentOS Team</p>
    </div>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `Application Update: ${jobTitle}`,
    html
  });
}

// ==========================================
// REJECTION EMAIL
// ==========================================

export async function sendRejectionEmail(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  feedback?: string
): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Application Update</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">Dear ${candidateName},</p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          Thank you for your interest in the <strong>${jobTitle}</strong> position at TalentOS 
          and for taking the time to apply.
        </p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          After careful consideration of your application, we regret to inform you that we have decided 
          to move forward with other candidates whose qualifications more closely match our current requirements.
        </p>
        
        ${feedback ? `
        <div style="background: white; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #4b5563;"><strong>Feedback:</strong> ${feedback}</p>
        </div>
        ` : ""}
        
        <p style="color: #4b5563; line-height: 1.6;">
          We encourage you to continue developing your skills and apply for future opportunities 
          that align with your experience. Your profile will remain in our talent pool for consideration 
          in upcoming roles.
        </p>
        
        <p style="color: #4b5563; margin-top: 24px;">
          We wish you the best in your career journey.<br/><br/>
          Best regards,<br/>
          <strong>The TalentOS Team</strong>
        </p>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; background: #f3f4f6;">
        TalentOS - AI-Powered Hiring Platform<br/>
        Keep exploring opportunities at our careers page!
      </div>
    </div>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `Application Update: ${jobTitle}`,
    html,
    text: `Dear ${candidateName}, Thank you for applying to ${jobTitle}. After reviewing your application, we have decided to move forward with other candidates. We encourage you to apply for future opportunities. Best regards, The TalentOS Team`
  });
}

// ==========================================
// OFFER LETTER EMAIL
// ==========================================

export async function sendOfferLetter(
  candidateEmail: string,
  candidateName: string,
  offerDetails: {
    jobTitle: string;
    salary: string;
    startDate: string;
    benefits?: string[];
    expiresAt?: string;
    signingLink?: string;
  }
): Promise<{ success: boolean }> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">You've received an offer!</p>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p style="font-size: 16px; color: #374151;">Dear ${candidateName},</p>
        
        <p style="color: #4b5563; line-height: 1.6;">
          We are thrilled to extend an offer for the <strong>${offerDetails.jobTitle}</strong> position at TalentOS!
        </p>
        
        <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #10b981;">
          <h3 style="margin: 0 0 16px; color: #1f2937;">📋 Offer Details</h3>
          <p><strong>Position:</strong> ${offerDetails.jobTitle}</p>
          <p><strong>Salary:</strong> ${offerDetails.salary}</p>
          <p><strong>Start Date:</strong> ${offerDetails.startDate}</p>
          ${offerDetails.benefits?.length ? `<p><strong>Benefits:</strong> ${offerDetails.benefits.join(", ")}</p>` : ""}
          ${offerDetails.expiresAt ? `<p style="color: #dc2626;"><strong>Offer Valid Until:</strong> ${offerDetails.expiresAt}</p>` : ""}
        </div>
        
        ${offerDetails.signingLink ? `
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #4b5563; margin-bottom: 16px;">Ready to accept? Click below to review and sign your offer:</p>
          <a href="${offerDetails.signingLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 40px; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
            ✍️ Review & Sign Offer
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">
            Or copy this link: ${offerDetails.signingLink}
          </p>
        </div>
        ` : ""}
        
        <p style="color: #4b5563; margin-top: 24px;">
          Best regards,<br/>
          <strong>The TalentOS Team</strong>
        </p>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; background: #f3f4f6;">
        TalentOS - AI-Powered Hiring Platform
      </div>
    </div>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `🎉 Job Offer: ${offerDetails.jobTitle} at TalentOS`,
    html,
    text: `Dear ${candidateName}, Congratulations! We are excited to offer you the ${offerDetails.jobTitle} position. Salary: ${offerDetails.salary}. Start Date: ${offerDetails.startDate}. ${offerDetails.signingLink ? `Sign your offer here: ${offerDetails.signingLink}` : ""} Best regards, The TalentOS Team`
  });
}

export default {
  sendEmail,
  sendShortlistEmail,
  sendInterviewInvite,
  sendStatusUpdate,
  sendRejectionEmail,
  sendOfferLetter
};

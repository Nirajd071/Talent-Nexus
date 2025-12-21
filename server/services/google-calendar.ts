/**
 * Google Calendar Service
 * Handles Google Calendar API integration for creating events with Google Meet links
 */

import { google } from "googleapis";

// Default redirect URI for Calendar OAuth
const CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/calendar/callback";

// OAuth2 Client Configuration
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    CALENDAR_REDIRECT_URI
);

console.log("📅 Google Calendar Redirect URI:", CALENDAR_REDIRECT_URI);

// Calendar API instance
const calendar = google.calendar({ version: "v3", auth: oauth2Client });

// Token storage (in production, store in database per user)
let storedTokens: any = null;

/**
 * Get OAuth authorization URL
 */
export function getAuthUrl(): string {
    const scopes = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events"
    ];

    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent"
    });
}

/**
 * Exchange authorization code for tokens
 */
export async function handleCallback(code: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        storedTokens = tokens;
        return { success: true };
    } catch (error: any) {
        console.error("Google Calendar auth error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if we have valid tokens
 */
export function isAuthenticated(): boolean {
    return storedTokens !== null;
}

/**
 * Set tokens (for restoring from database)
 */
export function setTokens(tokens: any): void {
    storedTokens = tokens;
    oauth2Client.setCredentials(tokens);
}

/**
 * Create a calendar event with Google Meet link
 */
export async function createMeetingEvent(options: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: Array<{ email: string; displayName?: string }>;
    timezone?: string;
}): Promise<{
    success: boolean;
    meetLink?: string;
    eventId?: string;
    eventLink?: string;
    error?: string;
}> {
    if (!storedTokens) {
        return { success: false, error: "Not authenticated with Google Calendar. Please connect your account." };
    }

    try {
        oauth2Client.setCredentials(storedTokens);

        const event = {
            summary: options.summary,
            description: options.description,
            start: {
                dateTime: options.startTime.toISOString(),
                timeZone: options.timezone || "Asia/Kolkata"
            },
            end: {
                dateTime: options.endTime.toISOString(),
                timeZone: options.timezone || "Asia/Kolkata"
            },
            attendees: options.attendees.map(a => ({
                email: a.email,
                displayName: a.displayName
            })),
            conferenceData: {
                createRequest: {
                    requestId: `talentos-${Date.now()}`,
                    conferenceSolutionKey: {
                        type: "hangoutsMeet"
                    }
                }
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: "email", minutes: 60 },
                    { method: "popup", minutes: 15 }
                ]
            }
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: "all" // Send email invites to attendees
        });

        const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || undefined;

        return {
            success: true,
            meetLink,
            eventId: response.data.id || undefined,
            eventLink: response.data.htmlLink || undefined
        };
    } catch (error: any) {
        console.error("Create meeting error:", error);

        // Check for token expiry
        if (error.code === 401) {
            storedTokens = null;
            return { success: false, error: "Google Calendar session expired. Please reconnect your account." };
        }

        return { success: false, error: error.message };
    }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    if (!storedTokens) {
        return { success: false, error: "Not authenticated" };
    }

    try {
        oauth2Client.setCredentials(storedTokens);

        await calendar.events.delete({
            calendarId: "primary",
            eventId
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export default {
    getAuthUrl,
    handleCallback,
    isAuthenticated,
    setTokens,
    createMeetingEvent,
    deleteEvent
};

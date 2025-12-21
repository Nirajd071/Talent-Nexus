/**
 * Google OAuth Configuration
 * Handles Google Sign-In for authentication
 */

import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { User } from "../db";
import { generateToken } from "./auth";

// Google OAuth credentials - MUST be set via environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

// Only configure Google Strategy if credentials are provided
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: CALLBACK_URL,
                scope: ["profile", "email"]
            },
            async (accessToken, refreshToken, profile: Profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) {
                        return done(new Error("No email provided by Google"), undefined);
                    }

                    // Find or create user
                    let user = await User.findOne({ email: email.toLowerCase() });

                    if (!user) {
                        // Create new user from Google profile
                        user = new User({
                            email: email.toLowerCase(),
                            role: "candidate", // Default role for Google sign-ups
                            profile: {
                                firstName: profile.name?.givenName || "",
                                lastName: profile.name?.familyName || "",
                                avatar: profile.photos?.[0]?.value || ""
                            },
                            emailVerified: true, // Google emails are verified
                            googleId: profile.id,
                            lastLoginAt: new Date()
                        });
                        await user.save();
                    } else {
                        // Update existing user with Google info
                        // FORCE role to candidate for Google logins (recruiters use OTP)
                        user.role = "candidate";
                        user.googleId = profile.id;
                        user.emailVerified = true;
                        user.lastLoginAt = new Date();
                        if (!user.profile?.avatar && profile.photos?.[0]?.value) {
                            user.profile = {
                                ...user.profile,
                                avatar: profile.photos[0].value
                            };
                        }
                        await user.save();
                    }

                    // Generate JWT token
                    const token = generateToken({
                        userId: user._id.toString(),
                        email: user.email,
                        role: user.role
                    });

                    // Pass user and token to callback
                    done(null, { user, token });
                } catch (error) {
                    done(error as Error, undefined);
                }
            }
        )
    );
    console.log("✅ Google OAuth configured");
} else {
    console.warn("⚠️ Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing");
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
    done(null, user);
});

passport.deserializeUser((user: any, done) => {
    done(null, user);
});

export default passport;

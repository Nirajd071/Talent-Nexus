import { Router } from "express";
import { db } from "../storage";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
// Note: In production use bcrypt or scrypt
import crypto from "crypto";

const router = Router();

// Helper to hash password (simple SHA256 for hackathon scope)
function hashPassword(password: string): string {
    return crypto.createHash("sha256").update(password).digest("hex");
}

router.post("/auth/register", async (req, res) => {
    try {
        const { email, password, name, role, department } = req.body;

        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const [user] = await db
            .insert(users)
            .values({
                email,
                passwordHash: hashPassword(password),
                name,
                role: role || "candidate",
                department,
            })
            .returning();

        // In a real app, generate JWT here
        const { passwordHash, ...safeUser } = user;
        res.status(201).json(safeUser);
    } catch (error) {
        res.status(500).json({ error: "Registration failed" });
    }
});

router.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user || user.passwordHash !== hashPassword(password)) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Record login
        await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        const { passwordHash, ...safeUser } = user;
        res.json({ user: safeUser });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Mock user context endpoint (dev only)
router.get("/auth/me", (req, res) => {
    // @ts-ignore
    if (req.user) {
        // @ts-ignore
        res.json(req.user);
    } else {
        res.status(401).json({ error: "Not logged in" });
    }
});

export default router;

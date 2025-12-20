import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface User {
    id: string;
    email: string;
    role: string;
    profile?: any;
}

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles = [],
    redirectTo = "/auth"
}: ProtectedRouteProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("token");
            const userData = localStorage.getItem("user");

            if (!token || !userData) {
                setIsLoading(false);
                return;
            }

            try {
                // Verify token with server
                const response = await fetch("/api/auth/me", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                    // Update localStorage with fresh data
                    localStorage.setItem("user", JSON.stringify(data));
                } else {
                    // Token invalid, clear storage
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                }
            } catch {
                // Try to use cached data
                try {
                    setUser(JSON.parse(userData));
                } catch {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                }
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return <Redirect to={redirectTo} />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect based on role
        if (user.role === "candidate") {
            return <Redirect to="/candidate" />;
        } else if (user.role === "recruiter" || user.role === "admin") {
            return <Redirect to="/dashboard" />;
        }
        return <Redirect to="/auth" />;
    }

    return <>{children}</>;
}

// Convenience wrappers
export function CandidateRoute({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["candidate"]}>
            {children}
        </ProtectedRoute>
    );
}

export function RecruiterRoute({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            {children}
        </ProtectedRoute>
    );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute allowedRoles={["admin"]}>
            {children}
        </ProtectedRoute>
    );
}

// Hook to get current user
export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch {
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/auth";
    };

    const isCandidate = user?.role === "candidate";
    const isRecruiter = user?.role === "recruiter" || user?.role === "admin";
    const isAdmin = user?.role === "admin";

    return { user, isLoading, logout, isCandidate, isRecruiter, isAdmin };
}

export default ProtectedRoute;

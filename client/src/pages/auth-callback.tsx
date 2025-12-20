import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
    const { toast } = useToast();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const role = params.get("role");
        const email = params.get("email");
        const name = params.get("name");
        const error = params.get("error");

        if (error) {
            toast({ title: "Login Failed", description: "Google authentication failed", variant: "destructive" });
            window.location.href = "/auth";
            return;
        }

        if (token) {
            // Store token and user info
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify({
                email: email || "",
                role: role || "candidate",
                profile: { firstName: name || "" }
            }));

            toast({ title: "Welcome!", description: `Signed in with Google` });

            // Redirect based on role
            if (role === "recruiter" || role === "admin") {
                window.location.href = "/dashboard";
            } else {
                window.location.href = "/candidate";
            }
        } else {
            window.location.href = "/auth";
        }
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
            <div className="text-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                <p className="text-lg">Completing sign in...</p>
            </div>
        </div>
    );
}

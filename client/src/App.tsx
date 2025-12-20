import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CandidatesPage from "@/pages/candidates";
import { TalentDiscovery } from "@/pages/TalentDiscovery";
import Pipeline from "@/pages/pipeline";
import Onboarding from "@/pages/onboarding";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Jobs from "@/pages/jobs";
import AgentCommandCenter from "@/pages/agents";
import AssessmentSecure from "@/pages/assessment-secure";
import SecureAssessment from "@/pages/secure-assessment";
import AssessmentStart from "@/pages/assessment-start";
import InterviewScheduler from "@/pages/interview-scheduler";
import EvaluationDashboard from "@/pages/evaluation-dashboard";
import SkillAssessments from "@/pages/skill-assessments";
import Interviews from "@/pages/interviews";
import NewHirePortal from "@/pages/candidate-portal";
import OfferManagement from "@/pages/offer-management";
import QuestionBank from "@/pages/question-bank";
import EmailCampaigns from "@/pages/email-campaigns";
import Referrals from "@/pages/referrals";
import AuthPage from "@/pages/auth";
import AuthCallback from "@/pages/auth-callback";
import CandidatePortal from "@/pages/candidate";
import AIHub from "@/pages/ai-hub";
import WorkflowsPage from "@/pages/workflows";
import TagsPage from "@/pages/tags";
import CalendarPage from "@/pages/calendar";
import JobBoardsPage from "@/pages/job-boards";
import OfferSigning from "@/pages/offer-signing";
import LearningReadiness from "@/pages/learning-readiness";
import ITProvisioning from "@/pages/it-provisioning";
import AttritionPrediction from "@/pages/attrition-prediction";

// ========================================
// AUTH CONTEXT & ROUTE PROTECTION
// ========================================

interface User {
    id?: string;
    email: string;
    role: string;
    profile?: { firstName?: string; lastName?: string };
}

function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
            } catch {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
        setIsLoading(false);
    }, []);

    return { user, isLoading };
}

// Loading spinner
function LoadingScreen() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );
}

// Landing page - redirects based on auth status and role
function LandingRedirect() {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingScreen />;

    if (!user) {
        return <Redirect to="/auth" />;
    }

    // Redirect based on role
    if (user.role === "recruiter" || user.role === "admin" || user.role === "interviewer") {
        return <Redirect to="/dashboard" />;
    } else {
        return <Redirect to="/candidate" />;
    }
}

// Protected route for Recruiters/Team
function RecruiterRoute({ component: Component }: { component: React.ComponentType }) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingScreen />;

    if (!user) {
        return <Redirect to="/auth" />;
    }

    if (user.role !== "recruiter" && user.role !== "admin" && user.role !== "interviewer") {
        return <Redirect to="/candidate" />;
    }

    return <Component />;
}

// Protected route for Candidates
function CandidateRoute({ component: Component }: { component: React.ComponentType }) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <LoadingScreen />;

    if (!user) {
        return <Redirect to="/auth" />;
    }

    return <Component />;
}

function Router() {
    return (
        <Switch>
            {/* Landing - redirects based on role */}
            <Route path="/" component={LandingRedirect} />

            {/* Auth Routes - public */}
            <Route path="/auth" component={AuthPage} />
            <Route path="/auth/callback" component={AuthCallback} />
            <Route path="/login" component={AuthPage} />
            <Route path="/register" component={AuthPage} />

            {/* Candidate Portal - any logged in user */}
            <Route path="/candidate">
                <CandidateRoute component={CandidatePortal} />
            </Route>

            {/* Secure Assessment - public with token */}
            <Route path="/assessment-secure" component={AssessmentSecure} />
            <Route path="/assessment-start/:sessionToken" component={AssessmentStart} />
            <Route path="/assessment/:token" component={SecureAssessment} />

            {/* Public offer signing page */}
            <Route path="/offer-signing/:token" component={OfferSigning} />

            {/* Recruiter/Team Dashboard - protected */}
            <Route path="/dashboard">
                <RecruiterRoute component={Dashboard} />
            </Route>
            <Route path="/jobs">
                <RecruiterRoute component={Jobs} />
            </Route>
            <Route path="/talent-discovery">
                <RecruiterRoute component={TalentDiscovery} />
            </Route>
            <Route path="/interviews">
                <RecruiterRoute component={InterviewScheduler} />
            </Route>
            <Route path="/interview-scheduler">
                <RecruiterRoute component={InterviewScheduler} />
            </Route>
            <Route path="/pipeline">
                <RecruiterRoute component={Pipeline} />
            </Route>
            <Route path="/evaluation">
                <RecruiterRoute component={EvaluationDashboard} />
            </Route>
            <Route path="/assessments">
                <RecruiterRoute component={SkillAssessments} />
            </Route>
            <Route path="/interviews">
                <RecruiterRoute component={Interviews} />
            </Route>
            <Route path="/question-bank">
                <RecruiterRoute component={QuestionBank} />
            </Route>
            <Route path="/offers">
                <RecruiterRoute component={OfferManagement} />
            </Route>
            <Route path="/onboarding">
                <RecruiterRoute component={Onboarding} />
            </Route>
            <Route path="/learning">
                <RecruiterRoute component={LearningReadiness} />
            </Route>
            <Route path="/provisioning">
                <RecruiterRoute component={ITProvisioning} />
            </Route>
            <Route path="/attrition">
                <RecruiterRoute component={AttritionPrediction} />
            </Route>
            <Route path="/analytics">
                <RecruiterRoute component={Analytics} />
            </Route>
            <Route path="/settings">
                <RecruiterRoute component={Settings} />
            </Route>
            <Route path="/agents">
                <RecruiterRoute component={AgentCommandCenter} />
            </Route>
            <Route path="/email-campaigns">
                <RecruiterRoute component={EmailCampaigns} />
            </Route>
            <Route path="/referrals">
                <RecruiterRoute component={Referrals} />
            </Route>
            <Route path="/ai-hub">
                <RecruiterRoute component={AIHub} />
            </Route>
            <Route path="/workflows">
                <RecruiterRoute component={WorkflowsPage} />
            </Route>
            <Route path="/tags">
                <RecruiterRoute component={TagsPage} />
            </Route>
            <Route path="/calendar">
                <RecruiterRoute component={CalendarPage} />
            </Route>
            <Route path="/job-boards">
                <RecruiterRoute component={JobBoardsPage} />
            </Route>

            {/* Public candidate routes */}
            <Route path="/candidate/portal">
                <NewHirePortal />
            </Route>

            <Route component={NotFound} />
        </Switch>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <Router />
            </TooltipProvider>
        </QueryClientProvider>
    );
}

export default App;

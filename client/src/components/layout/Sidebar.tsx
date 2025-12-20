import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  GitPullRequest,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  Briefcase,
  Bot,
  Calendar,
  ClipboardCheck,
  Code,
  FileSignature,
  Search,
  Target,
  Rocket,
  Database,
  Brain,
  Workflow,
  Tags,
  Globe,
  Mail,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
const logo = "/logo.png";

// Navigation organized by the three problem statement phases
const navigationSections = [
  {
    id: "platform",
    label: null, // No header for platform items
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Agent Command Center", href: "/agents", icon: Bot, isNew: true },
    ]
  },
  {
    id: "discovery",
    label: "Phase 1: Talent Discovery",
    icon: Search,
    description: "Pre-Hiring",
    items: [
      { name: "Jobs", href: "/jobs", icon: Briefcase },
      { name: "Talent Discovery", href: "/talent-discovery", icon: Users },
    ]
  },
  {
    id: "evaluation",
    label: "Phase 2: Evaluation",
    icon: Target,
    description: "Hiring",
    items: [
      { name: "Skill Assessments", href: "/assessments", icon: Code, isNew: true },
      { name: "Question Bank", href: "/question-bank", icon: Database, isNew: true },
      { name: "Evaluation Hub", href: "/evaluation", icon: ClipboardCheck, isNew: true },
      { name: "Interview Scheduler", href: "/interviews", icon: Calendar, isNew: true },
      { name: "Offer Management", href: "/offers", icon: FileSignature, isNew: true },
      { name: "Evaluation Pipeline", href: "/pipeline", icon: GitPullRequest },
    ]
  },
  {
    id: "readiness",
    label: "Phase 3: Readiness",
    icon: Rocket,
    description: "Post-Hiring",
    items: [
      { name: "Onboarding & Readiness", href: "/onboarding", icon: UserCheck },
      { name: "Learning Readiness", href: "/learning", icon: Brain, isNew: true },
      { name: "IT Provisioning", href: "/provisioning", icon: Database, isNew: true },
      { name: "Attrition Prediction", href: "/attrition", icon: Target, isNew: true },
    ]
  },
  {
    id: "insights",
    label: null, // No header for platform items
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "Settings", href: "/settings", icon: Settings },
    ]
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const [user, setUser] = useState<{ email: string; role: string; profile?: any } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/auth";
  };

  const getUserInitials = () => {
    if (user?.profile?.firstName) {
      return `${user.profile.firstName[0]}${user.profile.lastName?.[0] || ""}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const getUserName = () => {
    if (user?.profile?.firstName) {
      return `${user.profile.firstName} ${user.profile.lastName || ""}`.trim();
    }
    return user?.email?.split("@")[0] || "User";
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64">
      <div className="p-6 flex items-center gap-3">
        <img src={logo} alt="HireSphere" className="w-10 h-10 object-contain rounded" />
        <span className="font-display font-bold text-xl tracking-tight">
          <span className="text-foreground">Hire</span><span className="text-primary">Sphere</span>
        </span>
      </div>

      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.id} className={cn(sectionIndex > 0 && section.label && "mt-4")}>
            {/* Section Header */}
            {section.label && (
              <div className="px-3 py-2 mb-1">
                <div className="flex items-center gap-2">
                  {section.icon && <section.icon className="w-3.5 h-3.5 text-primary" />}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    {section.label}
                  </span>
                </div>
                {section.description && (
                  <span className="text-[10px] text-muted-foreground ml-5">
                    {section.description}
                  </span>
                )}
              </div>
            )}

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group relative",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="truncate">{item.name}</span>
                    {item.isNew && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Divider after sections with headers */}
            {section.label && (
              <div className="mx-3 mt-3 border-b border-sidebar-border/50" />
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {getUserInitials()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{getUserName()}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role || "User"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

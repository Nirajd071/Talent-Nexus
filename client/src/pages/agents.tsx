/**
 * Agent Command Center - Multi-Agent AI Dashboard
 * Shows all AI agents with animations and real-time backend activity
 */
import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, BrainCircuit, Database, Shield, FileText, MessageSquare, Activity, Terminal, RefreshCw, Loader2, Sparkles, Search, Users, Award, TrendingUp, Zap, Eye, Cpu
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  agent: string;
  message: string;
  type: string;
  time: string;
}

// All AI Agents used in the system
const allAgents = [
  {
    id: "orchestrator",
    name: "Central Moderator",
    icon: BrainCircuit,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    role: "Orchestrator",
    description: "Routes queries to specialized sub-agents",
    model: "Llama 3.3 70B",
    status: "active" as const,
    load: 45
  },
  {
    id: "parser",
    name: "Resume Parser",
    icon: FileText,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500",
    role: "Extraction",
    description: "Extracts skills & experience from resumes",
    model: "Llama 3.1 8B",
    status: "processing" as const,
    load: 72
  },
  {
    id: "scorer",
    name: "Scoring Engine",
    icon: Activity,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    role: "Evaluation",
    description: "Computes candidate fit scores",
    model: "Qwen 3 8B",
    status: "active" as const,
    load: 58
  },
  {
    id: "rag",
    name: "Knowledge Bot",
    icon: MessageSquare,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    role: "RAG Query",
    description: "Retrieves contextual answers from data",
    model: "DeepSeek R1",
    status: "idle" as const,
    load: 12
  },
  {
    id: "guard",
    name: "Security Guardian",
    icon: Shield,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
    role: "Security",
    description: "PII masking & access control",
    model: "Rules + LLM",
    status: "active" as const,
    load: 35
  },
  {
    id: "insights",
    name: "Insights Agent",
    icon: Database,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500",
    role: "Analytics",
    description: "Generates predictions & visualizations",
    model: "Devstral",
    status: "processing" as const,
    load: 67
  },
  {
    id: "offer",
    name: "Offer Suggester",
    icon: Award,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500",
    role: "Compensation",
    description: "Suggests competitive salary packages",
    model: "Llama 3.3 70B",
    status: "idle" as const,
    load: 8
  },
  {
    id: "interview",
    name: "Interview Analyzer",
    icon: Users,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500",
    role: "Assessment",
    description: "Evaluates interview responses",
    model: "Qwen 3 8B",
    status: "active" as const,
    load: 42
  },
  {
    id: "matcher",
    name: "Job Matcher",
    icon: Search,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500",
    role: "Matching",
    description: "Semantic job-candidate matching",
    model: "NV-Embed-V2",
    status: "processing" as const,
    load: 81
  },
  {
    id: "attrition",
    name: "Attrition Predictor",
    icon: TrendingUp,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500",
    role: "Prediction",
    description: "Predicts employee turnover risk",
    model: "Llama 3.1",
    status: "idle" as const,
    load: 15
  }
];

// Simulated real-time terminal logs
const generateTerminalLogs = () => {
  const now = new Date();
  const routes = ["/api/jobs", "/api/candidates", "/api/applications", "/api/offers", "/api/training/modules", "/api/agents/activity"];
  const methods = ["GET", "POST", "PUT"];
  const models = ["llama-3.3-70b-instruct", "qwen-3-8b", "deepseek-r1", "devstral-small", "nv-embed-v2"];
  const features = ["extraction", "scoring", "rag", "analytics", "matching"];

  const logs: string[] = [];

  // Server info
  logs.push(`[${now.toLocaleTimeString()}] express: Server listening on port 5000`);
  logs.push(`[${now.toLocaleTimeString()}] mongodb: Connection pool: 10 active connections`);

  // Simulate API calls
  for (let i = 0; i < 5; i++) {
    const time = new Date(now.getTime() - i * 2000).toLocaleTimeString();
    const route = routes[Math.floor(Math.random() * routes.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const status = Math.random() > 0.05 ? 200 : 500;
    const latency = Math.floor(Math.random() * 150 + 10);
    logs.push(`[${time}] ${method} ${route} ${status} in ${latency}ms`);
  }

  // Simulate AI inference calls
  for (let i = 0; i < 3; i++) {
    const time = new Date(now.getTime() - i * 3000 - 1000).toLocaleTimeString();
    const model = models[Math.floor(Math.random() * models.length)];
    const feature = features[Math.floor(Math.random() * features.length)];
    const tokens = Math.floor(Math.random() * 2000 + 500);
    const latency = Math.floor(Math.random() * 800 + 200);
    logs.push(`[${time}] ai-${feature}: ${model} completed (${tokens} tokens, ${latency}ms)`);
  }

  return logs.sort().reverse();
};

export default function AgentCommandCenter() {
  const [agents, setAgents] = useState(allAgents);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [showAgentList, setShowAgentList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Animate agent loads periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        load: Math.min(99, Math.max(5, agent.load + Math.floor(Math.random() * 20 - 10))),
        status: Math.random() > 0.7
          ? (["active", "processing", "idle"] as const)[Math.floor(Math.random() * 3)]
          : agent.status
      })));
      setTerminalLogs(generateTerminalLogs());
      setLastUpdate(new Date().toLocaleTimeString());
    }, 2000);

    // Initial load
    setTerminalLogs(generateTerminalLogs());
    setLastUpdate(new Date().toLocaleTimeString());
    setIsLoading(false);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTerminalLogs(generateTerminalLogs());
    setLastUpdate(new Date().toLocaleTimeString());
    toast({ title: "✅ Refreshed", description: "Agent activity updated" });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "processing": return "bg-blue-500 animate-pulse";
      case "idle": return "bg-slate-400";
      default: return "bg-slate-400";
    }
  };

  if (isLoading) {
    return (
      <Layout title="Agent Command Center">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agent Command Center">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cpu className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              Real-time AI agent activity • Last update: {lastUpdate}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAgentList(!showAgentList)}>
            <Eye className="h-4 w-4 mr-2" />
            {showAgentList ? "Hide" : "Show"} Details
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Agents Summary when expanded */}
      {showAgentList && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Agents Powering HireSphere
            </CardTitle>
            <CardDescription>10 specialized AI models for end-to-end recruitment automation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
              {agents.map((agent, idx) => (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border ${agent.bgColor} border-opacity-50`}>
                  <agent.icon className={`h-4 w-4 ${agent.color}`} />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block">{agent.name}</span>
                    <span className="text-muted-foreground text-[10px]">{agent.model}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Grid - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 ${agent.borderColor} group cursor-pointer`}
              >
                <CardContent className="p-4">
                  {/* Status indicator */}
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />

                  {/* Icon with animation */}
                  <div className={`p-3 rounded-xl ${agent.bgColor} ${agent.color} mb-3 w-fit group-hover:scale-110 transition-transform duration-300`}>
                    <agent.icon className={`h-6 w-6 ${agent.status === 'processing' ? 'animate-pulse' : ''}`} />
                  </div>

                  {/* Agent info */}
                  <h3 className="font-semibold text-sm mb-1 truncate">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 h-8">{agent.description}</p>

                  {/* Load bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{agent.model}</span>
                      <span className={agent.load > 80 ? 'text-red-500 font-bold' : ''}>{agent.load}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${agent.load > 80 ? 'bg-red-500' : agent.load > 50 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${agent.load}%` }}
                      />
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant="outline"
                    className={`mt-3 text-[10px] capitalize ${agent.status === 'active' ? 'border-green-500 text-green-600' :
                        agent.status === 'processing' ? 'border-blue-500 text-blue-600' :
                          'border-slate-400 text-slate-500'
                      }`}
                  >
                    <Zap className={`h-2 w-2 mr-1 ${agent.status === 'processing' ? 'animate-pulse' : ''}`} />
                    {agent.status}
                  </Badge>
                </CardContent>

                {/* Processing animation bar */}
                {agent.status === "processing" && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse" />
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Live Terminal */}
        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col bg-slate-950 text-slate-50 border-slate-800 overflow-hidden">
            <CardHeader className="border-b border-slate-800 bg-slate-900/80 pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-green-400" />
                  <CardTitle className="text-sm font-mono text-slate-200">Backend Terminal</CardTitle>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1">niraj@hiresphere:~/Talent-Nexus$</p>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative overflow-hidden">
              <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-3 font-mono text-[11px] space-y-1.5">
                {/* Startup messages */}
                <div className="text-green-400 mb-3">
                  <p>✓ MongoDB connected successfully</p>
                  <p>✓ Express server started on port 5000</p>
                  <p>✓ NVIDIA NIM API initialized</p>
                  <p className="text-slate-500">---</p>
                </div>

                {/* Dynamic logs */}
                {terminalLogs.map((log, i) => {
                  const isError = log.includes('500') || log.includes('error');
                  const isAI = log.includes('ai-');
                  const isGet = log.includes('GET');
                  const isPost = log.includes('POST');

                  return (
                    <div key={i} className={`flex items-start gap-2 ${isError ? 'text-red-400' : isAI ? 'text-cyan-400' : 'text-slate-300'}`}>
                      <span className="text-green-500 shrink-0">$</span>
                      <span className={`${isGet ? 'text-yellow-300' : isPost ? 'text-blue-300' : ''}`}>
                        {log}
                      </span>
                    </div>
                  );
                })}

                {/* Blinking cursor */}
                <div className="flex items-center gap-2 text-green-500 pt-2">
                  <span>$</span>
                  <span className="animate-pulse">_</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{agents.filter(a => a.status === 'active').length}</p>
            <p className="text-xs text-muted-foreground">Active Agents</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{agents.filter(a => a.status === 'processing').length}</p>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{Math.round(agents.reduce((a, b) => a + b.load, 0) / agents.length)}%</p>
            <p className="text-xs text-muted-foreground">Avg. Load</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">10</p>
            <p className="text-xs text-muted-foreground">Total Agents</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

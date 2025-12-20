import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, BrainCircuit, Database, Shield, FileText, MessageSquare, Activity, Terminal, RefreshCw, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "active" | "processing" | "idle";
  load: number;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  calls?: number;
  avgLatency?: number;
}

interface LogEntry {
  agent: string;
  message: string;
  type: string;
  time: string;
  model?: string;
  tokens?: number;
  latency?: number;
}

const agentMeta: Record<string, { icon: any; color: string; bgColor: string; role: string; description: string }> = {
  "Central Moderator": {
    icon: BrainCircuit, color: "text-primary", bgColor: "bg-primary/10", role: "Orchestrator",
    description: "Routes queries to specialized sub-agents and synthesizes final outputs."
  },
  "Resume Parser": {
    icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10", role: "Talent Discovery",
    description: "Extracts skills & experience using Llama 3.1 NER models."
  },
  "Scoring Engine": {
    icon: Activity, color: "text-green-500", bgColor: "bg-green-500/10", role: "Evaluation",
    description: "Computes candidate fit scores using Qwen3 analysis."
  },
  "Knowledge Bot": {
    icon: MessageSquare, color: "text-purple-500", bgColor: "bg-purple-500/10", role: "RAG Query",
    description: "Retrieves answers via DeepSeek RAG on candidate data."
  },
  "Security Guardian": {
    icon: Shield, color: "text-red-500", bgColor: "bg-red-500/10", role: "Multi-Tenancy",
    description: "Enforces tenant isolation, PII masking, and access rules."
  },
  "Insights Agent": {
    icon: Database, color: "text-orange-500", bgColor: "bg-orange-500/10", role: "Analytics",
    description: "Generates visualizations and predictive alerts using Devstral."
  }
};

export default function AgentCommandCenter() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchActivity = async (showToast = false) => {
    try {
      const res = await fetch("/api/agents/activity");
      if (res.ok) {
        const data = await res.json();

        // Map API agents to full agent objects with metadata
        const fullAgents = data.agents.map((agent: any) => {
          const meta = agentMeta[agent.name] || agentMeta["Central Moderator"];
          return {
            ...agent,
            icon: meta.icon,
            color: meta.color,
            bgColor: meta.bgColor,
            role: meta.role,
            description: meta.description
          };
        });

        setAgents(fullAgents);
        setLogs(data.logs || []);
        setLastUpdate(new Date().toLocaleTimeString());

        if (showToast) {
          toast({ title: "✅ Refreshed", description: `${data.totalLogs} AI operations in last hour` });
        }
      }
    } catch (e) {
      console.error("Failed to fetch agent activity:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    // Poll every 3 seconds for real-time updates
    const interval = setInterval(() => fetchActivity(), 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivity(true);
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
        <div>
          <p className="text-sm text-muted-foreground">
            Real-time AI agent activity • Last update: {lastUpdate}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agent Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative overflow-hidden hover:shadow-md transition-all border-l-4"
              style={{ borderLeftColor: agent.status === 'active' || agent.status === 'processing' ? 'currentColor' : 'transparent' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${agent.bgColor} ${agent.color}`}>
                    <agent.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <CardDescription className="text-xs">{agent.role}</CardDescription>
                  </div>
                </div>
                <Badge variant={agent.status === "active" ? "default" : agent.status === "processing" ? "secondary" : "outline"} className="capitalize">
                  {agent.status}
                </Badge>
              </CardHeader>
              <CardContent className="mt-2">
                <p className="text-xs text-muted-foreground mb-4 h-8">{agent.description}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>System Load</span>
                    <span>{agent.load}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${agent.load > 90 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${agent.load}%` }}
                    />
                  </div>
                </div>
                {agent.calls !== undefined && agent.calls > 0 && (
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>📞 {agent.calls} calls</span>
                    {agent.avgLatency !== undefined && <span>⏱️ {agent.avgLatency}ms avg</span>}
                  </div>
                )}
              </CardContent>
              {agent.status === "processing" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary animate-pulse" />
              )}
            </Card>
          ))}
        </div>

        {/* Live Terminal / Logs */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col bg-slate-950 text-slate-50 border-slate-800 min-h-[500px]">
            <CardHeader className="border-b border-slate-800 bg-slate-900/50 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-green-400" />
                  <CardTitle className="text-sm font-mono text-slate-200">System Activity Stream</CardTitle>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <div ref={scrollRef} className="absolute inset-0 overflow-y-auto p-4 font-mono text-xs space-y-3 scroll-smooth">
                {logs.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">
                    <p>No AI activity in the last hour</p>
                    <p className="text-xs mt-2">Activity will appear here as AI agents process requests</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                      <span className="text-slate-500 shrink-0 select-none">{log.time}</span>
                      <div className="space-y-0.5">
                        <span className={`font-bold ${log.agent === 'Security Guardian' ? 'text-red-400' :
                            log.agent === 'Scoring Engine' ? 'text-green-400' :
                              log.agent === 'Resume Parser' ? 'text-blue-400' :
                                log.agent === 'Knowledge Bot' ? 'text-purple-400' :
                                  log.agent === 'Insights Agent' ? 'text-orange-400' :
                                    'text-cyan-400'
                          }`}>
                          [{log.agent}]
                        </span>
                        <p className={`text-slate-300 ${log.type === 'secure' ? 'text-yellow-200' : log.type === 'error' ? 'text-red-300' : ''}`}>
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex gap-2 items-center text-green-500 pt-2 animate-pulse">
                  <span>_</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

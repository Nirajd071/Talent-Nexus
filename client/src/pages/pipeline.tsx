import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, Clock, Loader2, ArrowRight, RefreshCw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PipelineCandidate {
  _id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  matchScore?: number;
  status: string;
  appliedAt: string;
  updatedAt: string;
}

interface Job {
  _id: string;
  title: string;
  department?: string;
}

interface Stage {
  key: string;
  name: string;
  color: string;
}

const stages: Stage[] = [
  { key: "applied", name: "Applied", color: "bg-blue-500" },
  { key: "screening", name: "Screening", color: "bg-purple-500" },
  { key: "shortlisted", name: "Shortlisted", color: "bg-orange-500" },
  { key: "interview", name: "Interview", color: "bg-indigo-500" },
  { key: "offer", name: "Offer", color: "bg-green-500" },
];

export default function Pipeline() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [pipeline, setPipeline] = useState<Record<string, PipelineCandidate[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const { toast } = useToast();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchPipeline();
    }
  }, [selectedJob]);

  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
        if (data.length > 0) {
          setSelectedJob(data[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPipeline = async () => {
    if (!selectedJob) return;
    try {
      const response = await fetch(`/api/applications/pipeline/${selectedJob}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPipeline(data);
      }
    } catch (error) {
      console.error("Failed to fetch pipeline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPipeline = async () => {
    setIsRefreshing(true);
    try {
      await fetchPipeline();
      toast({ title: "Refreshed", description: "Pipeline data updated" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const moveCandidate = async (applicationId: string, newStatus: string) => {
    setIsUpdating(applicationId);
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({ title: "Status Updated", description: `Candidate moved to ${newStatus}` });
        fetchPipeline();
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to move candidate", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return "now";
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const currentJob = jobs.find(j => j._id === selectedJob);

  if (isLoading && jobs.length === 0) {
    return (
      <Layout title="Evaluation Pipeline">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Evaluation Pipeline">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map(job => (
                <SelectItem key={job._id} value={job._id}>
                  {job.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentJob && (
            <span className="text-sm text-muted-foreground">
              {currentJob.department || "General"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshPipeline} className="gap-2" disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" onClick={() => window.location.href = `/jobs?id=${selectedJob}`} className="gap-2" disabled={!selectedJob}>
            <Eye className="h-4 w-4" /> View Job Details
          </Button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No jobs found. Create a job first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const candidates = pipeline[stage.key] || [];
            return (
              <div key={stage.key} className="flex-none w-80 flex flex-col bg-muted/30 rounded-lg border border-border/50">
                <div className="p-4 flex items-center justify-between border-b border-border/50 bg-card/50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                    <span className="font-semibold text-sm">{stage.name}</span>
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5">
                      {candidates.length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>

                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {candidates.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No candidates</p>
                    ) : (
                      candidates.map((candidate) => (
                        <Card key={candidate._id} className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(candidate.candidateName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm leading-none">{candidate.candidateName}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{candidate.jobTitle}</p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isUpdating === candidate._id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="w-4 h-4" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {stages.filter(s => s.key !== stage.key).map(s => (
                                    <DropdownMenuItem key={s.key} onClick={() => moveCandidate(candidate._id, s.key)}>
                                      <ArrowRight className="h-4 w-4 mr-2" /> Move to {s.name}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuItem onClick={() => moveCandidate(candidate._id, "rejected")} className="text-red-600">
                                    Reject
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                              <div className="flex items-center gap-3">
                                {candidate.matchScore && (
                                  <Badge variant="outline" className="text-xs">
                                    {candidate.matchScore}% match
                                  </Badge>
                                )}
                                <span className="flex items-center gap-1 hover:text-foreground">
                                  <Clock className="w-3 h-3" /> {getTimeAgo(candidate.appliedAt)}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                {candidate.matchScore && candidate.matchScore >= 70 && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="High Match" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

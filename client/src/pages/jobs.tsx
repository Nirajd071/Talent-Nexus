import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  MoreHorizontal,
  Plus,
  Sparkles,
  Search,
  Loader2,
  Users,
  Edit,
  Trash2,
  Copy,
  XCircle,
  CheckCircle
} from "lucide-react";
import { CandidateRankingDialog } from "@/components/candidate-ranking-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Job {
  _id?: string;
  id?: string;
  title: string;
  department: string;
  location?: string;
  type?: string;
  description?: string;
  requirements?: string[];
  applicants: number;
  status: string;
  createdAt?: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [candidatesDialogOpen, setCandidatesDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Reusable fetch function
  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs");
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      toast({ title: "Error", description: "Failed to load jobs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Load jobs on mount
  useEffect(() => {
    fetchJobs();
  }, []);

  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [skills, setSkills] = useState("");
  const [description, setDescription] = useState("");

  // AI Generate Job Description
  const handleAIGenerate = async () => {
    if (!jobTitle || !department) {
      toast({ title: "Missing fields", description: "Please enter job title and department first.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          department,
          requirements: skills.split(",").map(s => s.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) throw new Error("Failed to generate");

      const data = await response.json();
      setDescription(data.description);

      // Auto-fill suggested skills if not already filled
      if (data.suggestedSkills && data.suggestedSkills.length > 0 && !skills.trim()) {
        setSkills(data.suggestedSkills.join(", "));
      }

      toast({
        title: "AI Generated!",
        description: "Job description and skills created. Review and edit as needed."
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Could not generate description. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save Job (Draft)
  const handleSaveDraft = async () => {
    if (!jobTitle || !department) {
      toast({ title: "Missing fields", description: "Please enter title and department.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          department,
          description,
          requirements: skills.split(",").map(s => s.trim()).filter(Boolean),
          status: "draft"
        }),
      });

      const newJob = {
        id: response.ok ? (await response.json())._id : String(Date.now()),
        title: jobTitle,
        department,
        location: "TBD",
        type: "Full-time",
        applicants: 0,
        status: "Draft",
        posted: "Just now"
      };

      setJobs(prev => [newJob, ...prev]);
      toast({ title: "Draft saved", description: "Job saved as draft." });
      resetForm();
      setDialogOpen(false);
    } catch {
      toast({ title: "Draft saved locally", description: "Job saved (offline mode)." });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Job
  const handlePublish = async () => {
    if (!jobTitle || !department || !description) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: jobTitle,
          department,
          description,
          requirements: skills.split(",").map(s => s.trim()).filter(Boolean),
          status: "active"
        }),
      });

      const newJob = {
        id: response.ok ? (await response.json())._id : String(Date.now()),
        title: jobTitle,
        department,
        location: "Remote",
        type: "Full-time",
        applicants: 0,
        status: "Active",
        posted: "Just now"
      };

      setJobs(prev => [newJob, ...prev]);
      toast({ title: "Job Published!", description: "Your job is now live and visible to candidates." });
      resetForm();
      setDialogOpen(false);
    } catch {
      toast({ title: "Published locally", description: "Job published (offline mode)." });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setJobTitle("");
    setDepartment("");
    setSkills("");
    setDescription("");
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout title="Job Management">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Create New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Job Requisition</DialogTitle>
              <DialogDescription>
                Use AI to generate a comprehensive job description in seconds.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Senior React Developer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department *</Label>
                  <Input
                    id="dept"
                    placeholder="e.g. Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Required Skills (Comma separated)</Label>
                <Input
                  id="skills"
                  placeholder="React, TypeScript, Node.js, AWS"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="desc">Job Description *</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-accent hover:text-accent/80 h-auto p-0 gap-1 font-normal"
                    onClick={handleAIGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-3 w-3" /> Auto-Generate with AI</>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="desc"
                  className="h-[150px]"
                  placeholder="Enter or generate job description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleSaveDraft}>Save as Draft</Button>
              <Button onClick={handlePublish} disabled={isSaving}>
                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</> : "Publish Job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {job.type}
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingJob(job);
                        setJobTitle(job.title);
                        setDepartment(job.department);
                        setSkills(job.requirements?.join(", ") || "");
                        setDescription(job.description || "");
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit Job
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        // Duplicate job
                        const newJob = {
                          ...job,
                          title: job.title + " (Copy)",
                          status: "draft",
                          applicants: 0
                        };
                        delete newJob._id;
                        delete newJob.id;
                        try {
                          const response = await fetch("/api/jobs", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(newJob)
                          });
                          if (response.ok) {
                            const created = await response.json();
                            setJobs(prev => [created, ...prev]);
                            toast({ title: "Job Duplicated!", description: "Copy created as draft." });
                          }
                        } catch {
                          toast({ title: "Duplicate failed", variant: "destructive" });
                        }
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const newStatus = job.status === "active" || job.status === "Active" ? "closed" : "active";
                        try {
                          const response = await fetch(`/api/jobs/${job._id || job.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: newStatus })
                          });
                          if (response.ok) {
                            const updated = await response.json();
                            setJobs(prev => prev.map(j => (j._id || j.id) === (job._id || job.id) ? updated : j));
                            toast({ title: newStatus === "active" ? "Job Reopened!" : "Job Closed" });
                          }
                        } catch {
                          toast({ title: "Status update failed", variant: "destructive" });
                        }
                      }}
                    >
                      {job.status === "active" || job.status === "Active" ? (
                        <><XCircle className="h-4 w-4 mr-2" /> Close Job</>
                      ) : (
                        <><CheckCircle className="h-4 w-4 mr-2" /> Reopen Job</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setJobToDelete(job);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Job
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{job.applicants}</span>
                    <span className="text-muted-foreground ml-1">Applicants</span>
                  </div>
                  <Badge variant={job.status === "Active" || job.status === "active" ? "default" : "secondary"} className="font-normal">
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recently"}
                  </span>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingJob(job);
                      setJobTitle(job.title);
                      setDepartment(job.department);
                      setSkills(job.requirements?.join(", ") || "");
                      setDescription(job.description || "");
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedJobId(job._id || job.id || "");
                      setSelectedJobTitle(job.title);
                      setCandidatesDialogOpen(true);
                    }}
                  >
                    <Users className="h-3 w-3 mr-1" /> View Candidates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Job Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Required Skills</Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="React, TypeScript, Node.js"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editingJob) return;
                setIsSaving(true);
                try {
                  const response = await fetch(`/api/jobs/${editingJob._id || editingJob.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: jobTitle,
                      department,
                      description,
                      requirements: skills.split(",").map(s => s.trim()).filter(Boolean)
                    })
                  });
                  if (response.ok) {
                    const updated = await response.json();
                    setJobs(prev => prev.map(j => (j._id || j.id) === (editingJob._id || editingJob.id) ? updated : j));
                    toast({ title: "Job Updated!", description: "Changes saved successfully." });
                  }
                } catch {
                  toast({ title: "Update Failed", variant: "destructive" });
                } finally {
                  setIsSaving(false);
                  setEditDialogOpen(false);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Candidates Dialog - AI Powered Ranking */}
      <CandidateRankingDialog
        open={candidatesDialogOpen}
        onClose={() => setCandidatesDialogOpen(false)}
        jobId={selectedJobId}
        jobTitle={selectedJobTitle}
        onUpdate={fetchJobs} // Refresh job list when candidates change
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={async () => {
                if (!jobToDelete) return;
                setIsDeleting(true);
                try {
                  const response = await fetch(`/api/jobs/${jobToDelete._id || jobToDelete.id}`, {
                    method: "DELETE"
                  });
                  if (response.ok) {
                    setJobs(prev => prev.filter(j => (j._id || j.id) !== (jobToDelete._id || jobToDelete.id)));
                    toast({ title: "Job Deleted", description: `"${jobToDelete.title}" removed successfully.` });
                    setDeleteConfirmOpen(false);
                  } else {
                    toast({ title: "Delete failed", description: "Could not delete job", variant: "destructive" });
                  }
                } catch {
                  toast({ title: "Delete failed", description: "Network error", variant: "destructive" });
                } finally {
                  setIsDeleting(false);
                  setJobToDelete(null);
                }
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

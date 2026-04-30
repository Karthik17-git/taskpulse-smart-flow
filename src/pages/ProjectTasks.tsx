import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getDeadlineColor, getPriority, statusLabel } from "@/lib/taskUtils";

interface Task {
  id: string; title: string; description: string | null; deadline: string | null;
  status: "pending" | "in_progress" | "completed";
  assignee_id: string | null; project_id: string;
}
interface Profile { id: string; display_name: string | null; email: string | null; }
interface Project { id: string; name: string; description: string | null; }

export default function ProjectTasks() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<Task["status"]>("pending");
  const [assigneeId, setAssigneeId] = useState<string>("unassigned");

  async function load() {
    if (!id) return;
    const [{ data: p }, { data: ts }, { data: pr }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("tasks").select("*").eq("project_id", id).order("deadline", { ascending: true, nullsFirst: false }),
      supabase.from("profiles").select("id,display_name,email"),
    ]);
    setProject(p);
    setTasks((ts as Task[]) || []);
    setProfiles(pr || []);
  }

  useEffect(() => { load(); }, [id]);

  function openCreate() {
    setEditing(null);
    setTitle(""); setDescription(""); setDeadline(""); setStatus("pending"); setAssigneeId("unassigned");
    setOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setTitle(t.title);
    setDescription(t.description || "");
    setDeadline(t.deadline || "");
    setStatus(t.status);
    setAssigneeId(t.assignee_id || "unassigned");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !id) return;
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      deadline: deadline || null,
      status,
      assignee_id: assigneeId === "unassigned" ? null : assigneeId,
    };
    if (editing) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert({
        ...payload, project_id: id, created_by: user.id,
      });
      if (error) return toast.error(error.message);
      toast.success("Task created");
    }
    setOpen(false);
    load();
  }

  async function deleteTask(t: Task) {
    if (!confirm(`Delete task "${t.title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Task deleted");
    load();
  }

  function getProfileName(uid: string | null): string {
    if (!uid) return "Unassigned";
    const p = profiles.find((x) => x.id === uid);
    return p?.display_name || p?.email || "Unknown";
  }

  const colorMap: Record<string, string> = {
    red: "bg-destructive", yellow: "bg-warning", green: "bg-success", gray: "bg-muted-foreground",
  };
  const priorityMap: Record<string, { label: string; cls: string }> = {
    high: { label: "High", cls: "bg-destructive/10 text-destructive border-destructive/20" },
    medium: { label: "Medium", cls: "bg-warning/10 text-warning border-warning/20" },
    low: { label: "Low", cls: "bg-success/10 text-success border-success/20" },
  };

  const canEditTask = (t: Task) => isAdmin || t.assignee_id === user?.id;

  return (
    <AppLayout>
      <Link to="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to projects
      </Link>

      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight truncate">{project?.name || "Project"}</h1>
          {project?.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="bg-gradient-primary hover:opacity-90 shrink-0">
            <Plus className="w-4 h-4 mr-2" /> New task
          </Button>
        )}
      </div>

      <Card className="shadow-card border-border/50 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No tasks yet. {isAdmin ? "Create the first one." : "Ask an admin to add tasks."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map((t) => {
              const color = getDeadlineColor(t.deadline, t.status);
              const priority = priorityMap[getPriority(t.deadline)];
              const editable = canEditTask(t);
              return (
                <div key={t.id} className="p-4 hover:bg-accent/30 transition-colors flex items-center gap-4">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap[color]}`} title={`Deadline: ${color}`} />
                  <button
                    onClick={() => editable && openEdit(t)}
                    disabled={!editable}
                    className="flex-1 min-w-0 text-left disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{t.title}</p>
                      <Badge variant="outline" className={priority.cls}>{priority.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{getProfileName(t.assignee_id)}</span>
                      <span>•</span>
                      <span>{t.deadline ? new Date(t.deadline).toLocaleDateString() : "No deadline"}</span>
                    </div>
                  </button>
                  <Badge variant="secondary" className="capitalize">{statusLabel[t.status]}</Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(t)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Update task" : "New task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t">Title</Label>
              <Input
                id="t" value={title} onChange={(e) => setTitle(e.target.value)}
                required maxLength={200}
                disabled={!isAdmin && !!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d">Description</Label>
              <Textarea
                id="d" value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                disabled={!isAdmin && !!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dl">Deadline</Label>
                <Input
                  id="dl" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                  disabled={!isAdmin && !!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={assigneeId}
                onValueChange={setAssigneeId}
                disabled={!isAdmin && !!editing}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-gradient-primary hover:opacity-90">
                {editing ? "Save changes" : "Create task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

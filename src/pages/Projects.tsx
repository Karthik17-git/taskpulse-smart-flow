import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, FolderKanban, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export default function Projects() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data: ps } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects(ps || []);
    const { data: ts } = await supabase.from("tasks").select("project_id");
    const map: Record<string, number> = {};
    (ts || []).forEach((t: any) => { map[t.project_id] = (map[t.project_id] || 0) + 1; });
    setCounts(map);
  }

  useEffect(() => { load(); }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("projects")
      .insert({ name: name.trim(), description: description.trim() || null, owner_id: user.id });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Project created");
    setOpen(false);
    setName(""); setDescription("");
    load();
  }

  return (
    <AppLayout>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Browse and manage your projects.</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" /> New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
              <form onSubmit={createProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pname">Name</Label>
                  <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pdesc">Description</Label>
                  <Textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting} className="bg-gradient-primary hover:opacity-90">
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border/50">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {isAdmin ? "No projects yet. Create one to get started." : "No projects yet. Ask an admin to create one."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="text-left"
            >
              <Card className="p-5 shadow-card border-border/50 hover:shadow-elegant hover:border-primary/30 transition-all h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">{p.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                  {p.description || "No description"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {counts[p.id] || 0} task{(counts[p.id] || 0) === 1 ? "" : "s"}
                </p>
              </Card>
            </button>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

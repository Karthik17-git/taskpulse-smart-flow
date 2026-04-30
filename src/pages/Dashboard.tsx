import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, AlertTriangle, UserCheck, Clock } from "lucide-react";
import { isOverdue, getDeadlineColor, statusLabel } from "@/lib/taskUtils";

interface Task {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assignee_id: string | null;
  project_id: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("tasks")
        .select("id,title,status,deadline,assignee_id,project_id")
        .order("deadline", { ascending: true, nullsFirst: false });
      setTasks(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const total = tasks.length;
  const overdue = tasks.filter((t) => isOverdue(t.deadline, t.status)).length;
  const mine = tasks.filter((t) => t.assignee_id === user?.id);
  const mineOpen = mine.filter((t) => t.status !== "completed").length;

  const summary = (() => {
    if (total === 0) return "No tasks yet. Create a project to get started.";
    if (overdue > 0)
      return `You have ${total} task${total > 1 ? "s" : ""}, ${overdue} overdue. Focus on urgent tasks.`;
    return `You have ${total} task${total > 1 ? "s" : ""}. Everything is on track. Keep it up!`;
  })();

  const upcoming = mine
    .filter((t) => t.status !== "completed")
    .slice(0, 5);

  const stats = [
    { label: "Total tasks", value: total, icon: ListChecks, color: "text-primary", bg: "bg-accent" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Assigned to me", value: mine.length, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
    { label: "My open", value: mineOpen, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">{summary}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 shadow-card border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{loading ? "—" : s.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="shadow-card border-border/50">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">My upcoming tasks</h2>
        </div>
        <div className="divide-y divide-border">
          {upcoming.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tasks assigned to you.
            </div>
          )}
          {upcoming.map((t) => {
            const color = getDeadlineColor(t.deadline, t.status);
            const colorMap: Record<string, string> = {
              red: "bg-destructive",
              yellow: "bg-warning",
              green: "bg-success",
              gray: "bg-muted-foreground",
            };
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/projects/${t.project_id}`)}
                className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors text-left"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${colorMap[color]}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.deadline ? new Date(t.deadline).toLocaleDateString() : "No deadline"}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">{statusLabel[t.status]}</Badge>
              </button>
            );
          })}
        </div>
      </Card>
    </AppLayout>
  );
}

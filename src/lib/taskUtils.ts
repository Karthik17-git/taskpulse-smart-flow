export type Priority = "high" | "medium" | "low";
export type DeadlineColor = "red" | "yellow" | "green" | "gray";

export function daysUntil(deadline: string | null): number | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  d.setHours(23, 59, 59, 999);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPriority(deadline: string | null): Priority {
  const days = daysUntil(deadline);
  if (days === null) return "low";
  if (days < 2) return "high";
  if (days < 5) return "medium";
  return "low";
}

export function getDeadlineColor(deadline: string | null, status: string): DeadlineColor {
  if (status === "completed") return "green";
  if (!deadline) return "gray";
  const days = daysUntil(deadline);
  if (days === null) return "gray";
  if (days < 0) return "red";
  if (days <= 2) return "yellow";
  return "green";
}

export function isOverdue(deadline: string | null, status: string): boolean {
  if (status === "completed" || !deadline) return false;
  const days = daysUntil(deadline);
  return days !== null && days < 0;
}

export const statusLabel: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/utils";
import type { Task } from "@/lib/types/database";
import { useToast } from "@/components/toast";
import { Pencil, Trash2, Pause, Play, X } from "lucide-react";

interface TasksManagerProps {
  initialTasks: Task[];
}

const CATEGORIES = ["engagement", "follow", "content", "other"];

export function TasksManager({ initialTasks }: TasksManagerProps) {
  const { confirm } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [showPanel, setShowPanel] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formReward, setFormReward] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formCategory, setFormCategory] = useState("engagement");
  const [formMaxParticipants, setFormMaxParticipants] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setFormTitle(""); setFormDescription(""); setFormUrl(""); setFormReward(""); setFormExpiry(""); setFormCategory("engagement"); setFormMaxParticipants("");
    setShowPanel(false); setEditingTask(null);
  }

  function openEdit(task: Task) {
    setEditingTask(task); setFormTitle(task.title); setFormDescription(task.description);
    setFormUrl(task.action_url); setFormReward(String(task.reward_usd));
    setFormExpiry(task.expires_at?.split("T")[0] ?? ""); setFormCategory(task.category || "engagement"); setFormMaxParticipants(task.max_participants != null ? String(task.max_participants) : "");
    setShowPanel(true);
  }

  function openCreate() { resetForm(); setShowPanel(true); }

  async function handleSave() {
    setSaving(true);
    const body = {
      title: formTitle, description: formDescription, action_url: formUrl,
      reward_usd: parseFloat(formReward), expires_at: formExpiry || null,
      category: formCategory, max_participants: formMaxParticipants || null,
      ...(editingTask ? { id: editingTask.id } : {}),
    };
    const res = await fetch("/api/admin/tasks", {
      method: editingTask ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      if (editingTask) { setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t))); }
      else { setTasks((prev) => [data, ...prev]); }
      resetForm();
    }
    setSaving(false);
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "active" ? "paused" : "active";
    const res = await fetch("/api/admin/tasks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: task.id, status: newStatus }) });
    if (res.ok) { setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t)); }
  }

  async function deleteTask(taskId: string) {
    if (!(await confirm("Delete this task permanently?"))) return;
    const res = await fetch(`/api/admin/tasks?id=${taskId}`, { method: "DELETE" });
    if (res.ok) { setTasks((prev) => prev.filter((t) => t.id !== taskId)); }
  }

  const statusBadge = (status: string) => {
    const c: Record<string, string> = { active: "bg-success/10 text-success", paused: "bg-warning/10 text-warning", expired: "bg-card text-muted" };
    return c[status] || "bg-card text-muted";
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold tracking-tight">Tasks</h1>
        <button onClick={openCreate} className="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 active:scale-[0.98] flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Task
        </button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-soft-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Reward</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Limit</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-[12px] font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, i) => (
              <tr key={task.id} className={`border-b border-border last:border-0 transition-colors hover:bg-accent-light/40 ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                <td className="px-4 py-3">
                  <p className="text-[14px] font-semibold truncate max-w-[200px]">{task.title}</p>
                  <p className="text-[12px] text-muted truncate max-w-[200px]">{task.description}</p>
                </td>
                <td className="px-4 py-3 text-[14px] font-semibold tabular-nums">{formatUSD(task.reward_usd)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold capitalize">
                    <span className={`h-1.5 w-1.5 rounded-full ${task.category === "engagement" ? "bg-blue-500" : task.category === "follow" ? "bg-purple-500" : task.category === "content" ? "bg-amber-500" : "bg-muted"}`} />
                    {task.category || "engagement"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge(task.status)}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${task.status === "active" ? "bg-success" : task.status === "paused" ? "bg-warning" : "bg-muted"}`} />
                    {task.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-muted tabular-nums">{task.max_participants != null ? task.max_participants : "—"}</td>
                <td className="px-4 py-3 text-[12px] text-muted">{new Date(task.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => toggleStatus(task)} className="rounded-lg p-2 text-muted hover:bg-accent-light hover:text-accent transition-colors" title={task.status === "active" ? "Pause" : "Activate"}>
                      {task.status === "active" ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button onClick={() => openEdit(task)} className="rounded-lg p-2 text-muted hover:bg-accent-light hover:text-accent transition-colors" title="Edit"><Pencil size={16} /></button>
                    <button onClick={() => deleteTask(task.id)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted">No tasks yet. Create one to get started.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto p-6 space-y-5 animate-in shadow-soft-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingTask ? "Edit Task" : "New Task"}</h2>
              <button onClick={resetForm} className="rounded-lg p-2 text-muted hover:bg-card-hover hover:text-foreground transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Title</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Action URL</label>
                <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Reward ($)</label>
                  <input type="number" step="0.01" min="0" value={formReward} onChange={(e) => setFormReward(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Expiry (optional)</label>
                  <input type="date" value={formExpiry} onChange={(e) => setFormExpiry(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-muted uppercase tracking-wider">Max Participants</label>
                  <input type="number" min="1" step="1" placeholder="No limit" value={formMaxParticipants} onChange={(e) => setFormMaxParticipants(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving || !formTitle || !formUrl || !formReward} className="rounded-xl bg-accent px-5 py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving..." : editingTask ? "Update" : "Create"}
              </button>
              <button onClick={resetForm} className="rounded-xl border border-border px-5 py-2.5 text-[13px] font-semibold text-muted hover:bg-card-hover">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

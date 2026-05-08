import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Goal,
  GoalStatus,
  GOAL_STATUSES,
  STATUS_STYLES,
  PRIORITY_STYLES,
  computeGoalProgress,
  goalDaysRemaining,
  goalConsistency,
  goalAvgDailyProgress,
  todayISO,
} from "@/lib/goals";
import { getHabits } from "@/lib/habits";
import { Trash2, Check, X, Plus } from "lucide-react";

interface GoalDetailDialogProps {
  goal: Goal | null;
  onClose: () => void;
  onSave: (g: Goal) => void;
  onDelete: (id: string) => void;
}

export default function GoalDetailDialog({ goal, onClose, onSave, onDelete }: GoalDetailDialogProps) {
  const [note, setNote] = useState("");
  const [delta, setDelta] = useState<string>("");
  const [milestoneTitle, setMilestoneTitle] = useState("");

  if (!goal) return null;
  const habits = getHabits().filter((h) => goal.linkedHabitIds.includes(h.id));
  const progress = computeGoalProgress(goal);
  const days = goalDaysRemaining(goal);
  const consistency = goalConsistency(goal);
  const avgDaily = goalAvgDailyProgress(goal);

  const updateStatus = (status: GoalStatus) => onSave({ ...goal, status });

  const addCheckIn = () => {
    if (!note.trim() && !delta) return;
    const checkIn = {
      date: todayISO(),
      note: note.trim(),
      progressDelta: delta ? Math.max(0, Math.min(100, Number(delta))) : undefined,
    };
    const newProgress = delta
      ? Math.max(0, Math.min(100, goal.progress + Number(delta)))
      : goal.progress;
    onSave({
      ...goal,
      checkIns: [checkIn, ...goal.checkIns],
      progress: newProgress,
    });
    setNote("");
    setDelta("");
  };

  const addMilestone = () => {
    if (!milestoneTitle.trim()) return;
    onSave({
      ...goal,
      milestones: [
        ...goal.milestones,
        { id: crypto.randomUUID(), title: milestoneTitle.trim(), done: false },
      ],
    });
    setMilestoneTitle("");
  };

  const toggleMilestone = (id: string) => {
    onSave({
      ...goal,
      milestones: goal.milestones.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
    });
  };

  const removeMilestone = (id: string) => {
    onSave({ ...goal, milestones: goal.milestones.filter((m) => m.id !== id) });
  };

  return (
    <Dialog open={!!goal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{goal.emoji}</span> {goal.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {goal.description && (
            <p className="text-sm text-muted-foreground">{goal.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_STYLES[goal.priority]}`}>
              {goal.priority}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_STYLES[goal.status]}`}>
              {goal.status}
            </span>
            <span className="text-xs px-2 py-1 rounded-full border bg-secondary/40 text-muted-foreground border-border">
              {goal.category}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-muted-foreground uppercase tracking-wider">Progress</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary/40 rounded-lg p-2">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Days Left</p>
              <p className="text-lg font-bold text-primary">{Math.max(0, days)}</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Consistency</p>
              <p className="text-lg font-bold text-accent">{consistency}%</p>
            </div>
            <div className="bg-secondary/40 rounded-lg p-2">
              <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Avg/Day</p>
              <p className="text-lg font-bold">{avgDaily}%</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    goal.status === s
                      ? `${STATUS_STYLES[s]} ring-2 ring-primary/30`
                      : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {habits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Linked Habits</p>
              <div className="flex flex-wrap gap-1.5">
                {habits.map((h) => (
                  <span key={h.id} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {h.emoji} {h.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Milestones</p>
            <div className="space-y-1.5 mb-2">
              {goal.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => toggleMilestone(m.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      m.done ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {m.done && <Check className="w-3 h-3" />}
                  </button>
                  <span className={`flex-1 ${m.done ? "line-through text-muted-foreground" : ""}`}>
                    {m.title}
                  </span>
                  <button onClick={() => removeMilestone(m.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {goal.milestones.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No milestones yet.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add milestone..."
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMilestone()}
              />
              <Button size="icon" onClick={addMilestone} variant="secondary">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daily Check-in</p>
            <Textarea
              placeholder="What did you do today?"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder="+ % progress"
                min={0}
                max={100}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
              <Button onClick={addCheckIn} className="btn-glossy border-0">Log</Button>
            </div>
          </div>

          {goal.checkIns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Check-ins</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {goal.checkIns.slice(0, 8).map((c, i) => (
                  <div key={i} className="text-xs border-b border-border/40 pb-1.5">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{c.date}</span>
                      {c.progressDelta != null && (
                        <span className="text-primary font-semibold">+{c.progressDelta}%</span>
                      )}
                    </div>
                    {c.note && <div className="text-foreground">{c.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Delete this goal?")) {
                  onDelete(goal.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

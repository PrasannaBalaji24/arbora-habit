import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Bell, Target } from "lucide-react";
import {
  GOAL_CATEGORIES,
  GOAL_PRIORITIES,
  Goal,
  GoalPriority,
  PRIORITY_STYLES,
  todayISO,
} from "@/lib/goals";
import { CATEGORY_STYLES, HabitCategory, getHabits } from "@/lib/habits";

const EMOJI_OPTIONS = ["🎯", "📖", "💪", "💰", "🎓", "🏆", "🌱", "🎨", "🏃", "🧘", "✈️", "🚀"];

interface AddGoalDialogProps {
  onAdd: (goal: Goal) => void;
}

export default function AddGoalDialog({ onAdd }: AddGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [category, setCategory] = useState<HabitCategory>("Productivity");
  const [priority, setPriority] = useState<GoalPriority>("Medium");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [checkInTime, setCheckInTime] = useState("09:00");
  const [linkedHabitIds, setLinkedHabitIds] = useState<string[]>([]);

  const habits = getHabits();

  const reset = () => {
    setTitle("");
    setDescription("");
    setEmoji("🎯");
    setCategory("Productivity");
    setPriority("Medium");
    setStartDate(todayISO());
    setCheckInEnabled(false);
    setLinkedHabitIds([]);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      emoji,
      category,
      priority,
      startDate,
      endDate,
      status: "Active",
      progress: 0,
      checkInTime: checkInEnabled ? checkInTime : undefined,
      milestones: [],
      checkIns: [],
      linkedHabitIds,
      createdAt: new Date().toISOString(),
    };
    onAdd(goal);
    reset();
    setOpen(false);
  };

  const toggleHabit = (id: string) => {
    setLinkedHabitIds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id],
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="btn-glossy rounded-full gap-2 shadow-md px-6 border-0">
          <Plus className="w-5 h-5" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Create a new goal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    emoji === e ? "bg-primary/15 scale-110 ring-2 ring-primary" : "hover:bg-secondary"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Title</label>
            <Input
              placeholder="e.g. Finish my novel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Description</label>
            <Textarea
              placeholder="What does success look like?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Start</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Target</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Priority</label>
            <div className="flex gap-2">
              {GOAL_PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    priority === p
                      ? `${PRIORITY_STYLES[p]} ring-2 ring-primary/40 scale-105`
                      : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    category === c
                      ? `${CATEGORY_STYLES[c]} ring-2 ring-primary/40 scale-105`
                      : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {habits.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Linked Habits (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {habits.map((h) => {
                  const active = linkedHabitIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabit(h.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                        active
                          ? "bg-primary/15 text-primary border-primary/40 ring-2 ring-primary/30"
                          : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
                      }`}
                    >
                      <span>{h.emoji}</span>
                      <span>{h.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Bell className="w-3 h-3" /> Daily Check-in
              </label>
              <button
                onClick={() => setCheckInEnabled(!checkInEnabled)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  checkInEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {checkInEnabled ? "On" : "Off"}
              </button>
            </div>
            {checkInEnabled && (
              <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
            )}
          </div>

          <Button onClick={handleSubmit} className="w-full btn-glossy border-0" disabled={!title.trim()}>
            Create Goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

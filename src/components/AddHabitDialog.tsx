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
import { Plus, Bell } from "lucide-react";
import { HABIT_CATEGORIES, CATEGORY_STYLES, HabitCategory } from "@/lib/habits";

const EMOJI_OPTIONS = ["💪", "📚", "🧘", "💧", "🏃", "🎨", "✍️", "😴", "🥗", "🎵", "💊", "🧹"];

interface AddHabitDialogProps {
  onAdd: (name: string, emoji: string, category: HabitCategory, reminderTime?: string) => void;
}

export default function AddHabitDialog({ onAdd }: AddHabitDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💪");
  const [category, setCategory] = useState<HabitCategory>("Health");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (reminderEnabled && "Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    onAdd(name.trim(), emoji, category, reminderEnabled ? reminderTime : undefined);
    setName("");
    setEmoji("💪");
    setCategory("Health");
    setReminderEnabled(false);
    setReminderTime("09:00");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="btn-glossy rounded-full gap-2 shadow-md px-6 border-0">
          <Plus className="w-5 h-5" />
          New Habit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a new habit</DialogTitle>
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
                    emoji === e
                      ? "bg-primary/15 scale-110 ring-2 ring-primary"
                      : "hover:bg-secondary"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Name</label>
            <Input
              placeholder="e.g. Drink 8 glasses of water"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_CATEGORIES.map((c) => (
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Bell className="w-3 h-3" /> Daily Reminder
              </label>
              <button
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  reminderEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {reminderEnabled ? "On" : "Off"}
              </button>
            </div>
            {reminderEnabled && (
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full"
              />
            )}
          </div>

          <Button onClick={handleSubmit} className="w-full btn-glossy border-0" disabled={!name.trim()}>
            Add Habit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

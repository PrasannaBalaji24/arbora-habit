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
import { Plus } from "lucide-react";

const EMOJI_OPTIONS = ["💪", "📚", "🧘", "💧", "🏃", "🎨", "✍️", "😴", "🥗", "🎵", "💊", "🧹"];

interface AddHabitDialogProps {
  onAdd: (name: string, emoji: string) => void;
}

export default function AddHabitDialog({ onAdd }: AddHabitDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💪");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), emoji);
    setName("");
    setEmoji("💪");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
          <Input
            placeholder="e.g. Drink 8 glasses of water"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
          <Button onClick={handleSubmit} className="w-full btn-glossy border-0" disabled={!name.trim()}>
            Add Habit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

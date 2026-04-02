import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TimeSpentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (minutes: number) => void;
  habitName: string;
}

export default function TimeSpentModal({ open, onClose, onSubmit, habitName }: TimeSpentModalProps) {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  const handleSubmit = () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (totalMinutes > 0) {
      onSubmit(totalMinutes);
    }
    setHours("");
    setMinutes("");
  };

  const handleSkip = () => {
    onSubmit(0);
    setHours("");
    setMinutes("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">How much time did you spend on "{habitName}"?</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 items-end pt-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
            <Input
              type="number"
              min="0"
              max="24"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="0"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleSubmit} className="flex-1 btn-glossy border-0">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

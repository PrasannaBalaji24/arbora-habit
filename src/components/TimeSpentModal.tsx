import { useState, useEffect } from "react";
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
  onSubmit: (minutes: number, fromTime?: string, toTime?: string) => void;
  habitName: string;
}

function diffMinutes(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return th * 60 + tm - (fh * 60 + fm);
}

export default function TimeSpentModal({ open, onClose, onSubmit, habitName }: TimeSpentModalProps) {
  const [fromTime, setFromTime] = useState("09:00");
  const [toTime, setToTime] = useState("10:00");

  useEffect(() => {
    if (open) {
      setFromTime("09:00");
      setToTime("10:00");
    }
  }, [open]);

  const minutes = Math.max(0, diffMinutes(fromTime, toTime));

  const handleSubmit = () => {
    if (minutes > 0) {
      onSubmit(minutes, fromTime, toTime);
    } else {
      onSubmit(0);
    }
  };

  const handleSkip = () => {
    onSubmit(0);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">When did you do "{habitName}"?</DialogTitle>
        </DialogHeader>
        <div className="flex gap-3 items-end pt-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <Input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          {minutes > 0 ? `Duration: ${Math.floor(minutes / 60)}h ${minutes % 60}m` : "Pick a valid range"}
        </p>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleSkip} className="flex-1">
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={minutes <= 0} className="flex-1 btn-glossy border-0">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { TimeBlock, formatTimeLabel } from "@/lib/habits";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

interface TimeBlockSectionProps {
  timeBlocks: TimeBlock[];
  onUpdate: (blocks: TimeBlock[]) => void;
}

export default function TimeBlockSection({ timeBlocks, onUpdate }: TimeBlockSectionProps) {
  const updateBlock = (id: string, description: string) => {
    onUpdate(timeBlocks.map((b) => (b.id === id ? { ...b, description } : b)));
  };

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" /> Time Blocks
      </h3>
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
        {timeBlocks.map((block) => (
          <div key={block.id} className="flex items-center gap-3 group">
            <span className="text-xs text-muted-foreground font-mono w-[130px] shrink-0">
              {formatTimeLabel(block.startTime)} – {formatTimeLabel(block.endTime)}
            </span>
            <Input
              placeholder="What did you do?"
              value={block.description}
              onChange={(e) => updateBlock(block.id, e.target.value)}
              className="h-7 text-xs bg-secondary/30 border-border/30 focus:border-primary/50"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { NotebookPen } from "lucide-react";

interface DayNotesProps {
  notes: string;
  onSave: (notes: string) => void;
}

export default function DayNotes({ notes, onSave }: DayNotesProps) {
  const [value, setValue] = useState(notes);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setValue(notes);
  }, [notes]);

  const handleSave = () => {
    onSave(value);
    setExpanded(false);
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <NotebookPen className="w-4 h-4" />
        {notes ? "View/Edit Day Notes" : "Add notes about your day"}
      </button>
      {expanded && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Textarea
            placeholder="How was your day? What went well? Any reflections..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <Button onClick={handleSave} size="sm" className="btn-glossy border-0">
            Save Notes
          </Button>
        </div>
      )}
      {!expanded && notes && (
        <p className="text-sm text-muted-foreground line-clamp-2 italic">{notes}</p>
      )}
    </div>
  );
}

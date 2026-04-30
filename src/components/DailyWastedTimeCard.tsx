import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  WASTED_CATEGORIES,
  WastedTimeEntry,
  formatMinutes,
} from "@/lib/habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FancyPieChart, { PieDatum } from "@/components/charts/FancyPieChart";
import { colorForWastedCategory } from "@/lib/chart-colors";

interface Props {
  entries: WastedTimeEntry[];
  onChange: (next: WastedTimeEntry[]) => void;
}

export default function DailyWastedTimeCard({ entries, onChange }: Props) {
  const [category, setCategory] = useState(WASTED_CATEGORIES[0]);
  const [minutes, setMinutes] = useState("");

  const total = entries.reduce((s, e) => s + e.minutes, 0);
  const grouped: Record<string, number> = {};
  entries.forEach((w) => {
    grouped[w.category] = (grouped[w.category] || 0) + w.minutes;
  });

  const add = () => {
    const m = parseInt(minutes) || 0;
    if (m <= 0) return;
    onChange([...entries, { category, minutes: m }]);
    setMinutes("");
  };

  const remove = (i: number) => {
    onChange(entries.filter((_, idx) => idx !== i));
  };

  const pieData: PieDatum[] = Object.entries(grouped).map(([name, value], i) => ({
    name,
    value,
    color: colorForWastedCategory(name, i),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          ⏳ Wasted Time
        </h3>
        <span className="text-xs font-bold text-destructive">{formatMinutes(total)}</span>
      </div>

      {/* Logger */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WASTED_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 flex-1">
          <Input
            type="number"
            min="1"
            placeholder="Minutes"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className="h-9"
          />
          <Button onClick={add} size="icon" className="btn-glossy border-0 shrink-0 h-9 w-9">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {pieData.length > 0 ? (
        <>
          <FancyPieChart
            data={pieData}
            centerLabel={formatMinutes(total)}
            centerSubLabel="Wasted"
            compact
            height={180}
          />

          {/* Entries list */}
          <div className="mt-4 space-y-1">
            {entries.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/40 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: colorForWastedCategory(w.category) }}
                  />
                  <span className="text-muted-foreground">{w.category}</span>
                  <span className="font-medium text-foreground">{formatMinutes(w.minutes)}</span>
                </div>
                <button
                  onClick={() => remove(i)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic py-2">No wasted time logged for this day 🎉</p>
      )}
    </div>
  );
}

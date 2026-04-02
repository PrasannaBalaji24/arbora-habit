import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2 } from "lucide-react";
import {
  WASTED_CATEGORIES,
  WastedTimeEntry,
  getDayLogs,
  saveDayLogs,
  getDayEntry,
  todayStr,
  formatDate,
  addDays,
  formatMinutes,
  getDayTotalWastedTime,
  DayLogs,
} from "@/lib/habits";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WastedTime() {
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [newCategory, setNewCategory] = useState(WASTED_CATEGORIES[0]);
  const [newMinutes, setNewMinutes] = useState("");

  useEffect(() => {
    setDayLogs(getDayLogs());
  }, []);

  const updateDayLogs = useCallback((dl: DayLogs) => {
    setDayLogs(dl);
    saveDayLogs(dl);
  }, []);

  const dayEntry = getDayEntry(dayLogs, selectedDate);
  const wastedList = dayEntry.wastedTime || [];
  const totalWasted = getDayTotalWastedTime(dayEntry);

  const addWasted = () => {
    const mins = parseInt(newMinutes) || 0;
    if (mins <= 0) return;
    const entry: WastedTimeEntry = { category: newCategory, minutes: mins };
    const updated = { ...dayEntry, wastedTime: [...wastedList, entry] };
    updateDayLogs({ ...dayLogs, [selectedDate]: updated });
    setNewMinutes("");
  };

  const removeWasted = (index: number) => {
    const updated = { ...dayEntry, wastedTime: wastedList.filter((_, i) => i !== index) };
    updateDayLogs({ ...dayLogs, [selectedDate]: updated });
  };

  const dateInfo = formatDate(selectedDate);
  const isToday = selectedDate === todayStr();

  // Group by category
  const grouped: Record<string, number> = {};
  wastedList.forEach((w) => {
    grouped[w.category] = (grouped[w.category] || 0) + w.minutes;
  });

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      {/* Date nav */}
      <div className="gradient-header text-primary-foreground py-4 px-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Wasted Time</h1>
            <p className="text-sm opacity-80">{dateInfo.month} {dateInfo.day}, {dateInfo.year}</p>
          </div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {!isToday && (
          <div className="text-center mt-2">
            <button onClick={() => setSelectedDate(todayStr())} className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity underline">
              <CalendarDays className="w-3 h-3" /> Back to today
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Add form */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Log Wasted Time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={newCategory} onValueChange={setNewCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WASTED_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Minutes"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addWasted()}
              />
              <Button onClick={addWasted} size="icon" className="btn-glossy border-0 shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Daily Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive mb-3">{formatMinutes(totalWasted)}</div>
            {Object.entries(grouped).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(grouped).map(([cat, mins]) => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{cat}</span>
                    <span className="font-medium text-foreground">{formatMinutes(mins)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No wasted time logged 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entries list */}
      {wastedList.length > 0 && (
        <Card className="mt-4 border-border bg-card">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {wastedList.map((w, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{w.category}</span>
                    <span className="text-sm font-medium">{formatMinutes(w.minutes)}</span>
                  </div>
                  <button onClick={() => removeWasted(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-40 hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

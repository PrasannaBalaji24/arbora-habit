import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getHabits,
  getDayLogs,
  getWeekDates,
  getDayEntry,
  getDayTotalHabitTime,
  getDayTotalWastedTime,
  getDayCompletionRate,
  formatMinutes,
  todayStr,
  addDays,
  formatDate,
  Habit,
  DayLogs,
} from "@/lib/habits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function WeeklyReport() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [weekStart, setWeekStart] = useState(todayStr());

  useEffect(() => {
    setHabits(getHabits());
    setDayLogs(getDayLogs());
  }, []);

  const weekDates = getWeekDates(weekStart);
  const firstDate = formatDate(weekDates[0]);
  const lastDate = formatDate(weekDates[6]);

  const chartData = weekDates.map((date) => {
    const entry = getDayEntry(dayLogs, date);
    const d = formatDate(date);
    return {
      name: d.weekday.slice(0, 3),
      productive: Math.round(getDayTotalHabitTime(entry) / 60 * 10) / 10,
      wasted: Math.round(getDayTotalWastedTime(entry) / 60 * 10) / 10,
    };
  });

  const totalHabitMins = weekDates.reduce((s, d) => s + getDayTotalHabitTime(getDayEntry(dayLogs, d)), 0);
  const totalWastedMins = weekDates.reduce((s, d) => s + getDayTotalWastedTime(getDayEntry(dayLogs, d)), 0);
  const avgCompletion = weekDates.length > 0
    ? Math.round(weekDates.reduce((s, d) => s + getDayCompletionRate(getDayEntry(dayLogs, d), habits.length), 0) / weekDates.length)
    : 0;

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="gradient-header text-primary-foreground py-4 px-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Weekly Report</h1>
            <p className="text-sm opacity-80">{firstDate.month} {firstDate.day} – {lastDate.month} {lastDate.day}, {lastDate.year}</p>
          </div>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Productive Time</p>
            <p className="text-2xl font-bold text-primary">{formatMinutes(totalHabitMins)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Wasted Time</p>
            <p className="text-2xl font-bold text-destructive">{formatMinutes(totalWastedMins)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Completion</p>
            <p className="text-2xl font-bold text-accent">{avgCompletion}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Hours by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(230 6% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(230 6% 50%)", fontSize: 12 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip
                  contentStyle={{ background: "hsl(230 12% 12%)", border: "1px solid hsl(230 10% 18%)", borderRadius: 8, color: "hsl(40 15% 85%)" }}
                  formatter={(value: number, name: string) => [`${value}h`, name === "productive" ? "Productive" : "Wasted"]}
                />
                <Legend />
                <Bar dataKey="productive" fill="hsl(5 70% 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wasted" fill="hsl(0 55% 50%)" radius={[4, 4, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

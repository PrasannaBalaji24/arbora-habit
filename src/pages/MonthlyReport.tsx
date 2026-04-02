import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getHabits,
  getDayLogs,
  getLogs,
  getMonthDates,
  getDayEntry,
  getDayTotalHabitTime,
  getDayTotalWastedTime,
  getDayCompletionRate,
  formatMinutes,
  getStreak,
  todayStr,
  Habit,
  DayLogs,
  HabitLog,
} from "@/lib/habits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

export default function MonthlyReport() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [logs, setLogs] = useState<HabitLog>({});
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    setHabits(getHabits());
    setDayLogs(getDayLogs());
    setLogs(getLogs());
  }, []);

  const refDate = new Date();
  refDate.setMonth(refDate.getMonth() + monthOffset);
  const refStr = refDate.toISOString().split("T")[0];
  const monthDates = getMonthDates(refStr);
  const monthName = refDate.toLocaleDateString("en", { month: "long", year: "numeric" });

  const totalHabitMins = monthDates.reduce((s, d) => s + getDayTotalHabitTime(getDayEntry(dayLogs, d)), 0);
  const totalWastedMins = monthDates.reduce((s, d) => s + getDayTotalWastedTime(getDayEntry(dayLogs, d)), 0);
  const avgCompletion = monthDates.length > 0
    ? Math.round(monthDates.reduce((s, d) => s + getDayCompletionRate(getDayEntry(dayLogs, d), habits.length), 0) / monthDates.length)
    : 0;

  const chartData = monthDates.map((date) => {
    const entry = getDayEntry(dayLogs, date);
    const day = parseInt(date.split("-")[2]);
    return {
      name: day,
      productive: Math.round(getDayTotalHabitTime(entry) / 60 * 10) / 10,
      wasted: Math.round(getDayTotalWastedTime(entry) / 60 * 10) / 10,
      completion: getDayCompletionRate(entry, habits.length),
    };
  });

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="gradient-header text-primary-foreground py-4 px-6 rounded-xl mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => setMonthOffset((o) => o - 1)} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold">Monthly Report</h1>
            <p className="text-sm opacity-80">{monthName}</p>
          </div>
          <button onClick={() => setMonthOffset((o) => o + 1)} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Productive</p>
            <p className="text-2xl font-bold text-primary">{formatMinutes(totalHabitMins)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Wasted</p>
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

      {/* Habit streaks */}
      {habits.length > 0 && (
        <Card className="border-border bg-card mb-6">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Habit Streaks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {habits.map((h) => {
                const streak = getStreak(h.id, logs);
                return (
                  <div key={h.id} className="flex items-center justify-between py-1">
                    <span className="text-sm flex items-center gap-2">
                      <span>{h.emoji}</span>
                      <span>{h.name}</span>
                    </span>
                    <span className={`text-sm font-bold ${streak > 0 ? "streak-glow" : "text-muted-foreground"}`}>
                      {streak > 0 ? `🔥 ${streak} days` : "No streak"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar chart */}
      <Card className="border-border bg-card mb-6">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Daily Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(230 6% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(230 6% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip contentStyle={{ background: "hsl(230 12% 12%)", border: "1px solid hsl(230 10% 18%)", borderRadius: 8, color: "hsl(40 15% 85%)" }} />
                <Legend />
                <Bar dataKey="productive" fill="hsl(5 70% 55%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="wasted" fill="hsl(0 55% 50%)" radius={[2, 2, 0, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Completion line chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(230 6% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(230 6% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(230 12% 12%)", border: "1px solid hsl(230 10% 18%)", borderRadius: 8, color: "hsl(40 15% 85%)" }} />
                <Line type="monotone" dataKey="completion" stroke="hsl(200 65% 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

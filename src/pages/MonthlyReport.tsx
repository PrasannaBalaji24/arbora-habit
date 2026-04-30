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
  Habit,
  DayLogs,
  HabitLog,
} from "@/lib/habits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import FancyPieChart, { PieDatum } from "@/components/charts/FancyPieChart";
import { colorForHabitCategory, colorForWastedCategory } from "@/lib/chart-colors";

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

  // Productive by habit category
  const habitCategoryTotals: Record<string, number> = {};
  monthDates.forEach((date) => {
    const entry = getDayEntry(dayLogs, date);
    Object.entries(entry.habits || {}).forEach(([habitId, detail]) => {
      const habit = habits.find((h) => h.id === habitId);
      const cat = habit?.category || "Uncategorized";
      habitCategoryTotals[cat] = (habitCategoryTotals[cat] || 0) + (detail.timeSpent || 0);
    });
  });

  const wastedCategoryTotals: Record<string, number> = {};
  monthDates.forEach((date) => {
    const entry = getDayEntry(dayLogs, date);
    (entry.wastedTime || []).forEach((w) => {
      wastedCategoryTotals[w.category] = (wastedCategoryTotals[w.category] || 0) + w.minutes;
    });
  });

  const productivePie: PieDatum[] = Object.entries(habitCategoryTotals)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({ name, value, color: colorForHabitCategory(name, i) }));

  const wastedPie: PieDatum[] = Object.entries(wastedCategoryTotals)
    .filter(([, v]) => v > 0)
    .map(([name, value], i) => ({ name, value, color: colorForWastedCategory(name, i) }));

  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    color: "hsl(var(--popover-foreground))",
    boxShadow: "0 6px 20px hsl(0 0% 0% / 0.15)",
  };

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

      {/* Pie charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Productive · by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FancyPieChart
              data={productivePie}
              centerLabel={formatMinutes(totalHabitMins)}
              centerSubLabel="Total"
              compact
              height={200}
            />
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Wasted · by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FancyPieChart
              data={wastedPie}
              centerLabel={formatMinutes(totalWastedMins)}
              centerSubLabel="Total"
              compact
              height={200}
            />
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
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={2}>
                <defs>
                  <linearGradient id="mBarProductive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(170 65% 55%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(170 60% 38%)" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="mBarWasted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(35 85% 62%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(35 80% 48%)" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="productive" fill="url(#mBarProductive)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wasted" fill="url(#mBarWasted)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Completion area chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Completion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="completionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="completion"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#completionFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

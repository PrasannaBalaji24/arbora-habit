import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ExportPDFButton from "@/components/ExportPDFButton";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import FancyPieChart, { PieDatum } from "@/components/charts/FancyPieChart";
import { colorForHabitCategory, colorForWastedCategory } from "@/lib/chart-colors";

export default function WeeklyReport() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [weekStart, setWeekStart] = useState(todayStr());
  const printRef = useRef<HTMLDivElement>(null);

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

  // Productive breakdown by habit category
  const habitCategoryTotals: Record<string, number> = {};
  weekDates.forEach((date) => {
    const entry = getDayEntry(dayLogs, date);
    Object.entries(entry.habits || {}).forEach(([habitId, detail]) => {
      const habit = habits.find((h) => h.id === habitId);
      const cat = habit?.category || "Uncategorized";
      habitCategoryTotals[cat] = (habitCategoryTotals[cat] || 0) + (detail.timeSpent || 0);
    });
  });

  // Wasted breakdown by category
  const wastedCategoryTotals: Record<string, number> = {};
  weekDates.forEach((date) => {
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

      {/* Pie charts side-by-side */}
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

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Hours by Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <defs>
                  <linearGradient id="barProductive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(170 65% 55%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(170 60% 38%)" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="barWasted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(35 85% 62%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(35 80% 48%)" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} unit="h" />
                <Tooltip
                  cursor={{ fill: "hsl(var(--secondary) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 10,
                    color: "hsl(var(--popover-foreground))",
                    boxShadow: "0 6px 20px hsl(0 0% 0% / 0.15)",
                  }}
                  formatter={(value: number, name: string) => [`${value}h`, name === "productive" ? "Productive" : "Wasted"]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="productive" fill="url(#barProductive)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="wasted" fill="url(#barWasted)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

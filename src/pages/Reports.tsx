import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Flame, Target, Clock, CheckCircle2 } from "lucide-react";
import {
  getHabits,
  getDayLogs,
  getLogs,
  getDayEntry,
  getDayTotalHabitTime,
  getDayTotalWastedTime,
  getDayCompletionRate,
  getWeekDates,
  getMonthDates,
  getStreak,
  formatMinutes,
  formatDate,
  todayStr,
  addDays,
  Habit,
  DayLogs,
  HabitLog,
} from "@/lib/habits";
import { getGoals, computeGoalProgress, Goal } from "@/lib/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import FancyPieChart, { PieDatum } from "@/components/charts/FancyPieChart";
import { colorForHabitCategory, colorForWastedCategory } from "@/lib/chart-colors";
import ExportPDFButton from "@/components/ExportPDFButton";

type Period = "weekly" | "monthly" | "yearly";

function getYearMonths(refDate: Date): { dates: string[]; label: string }[] {
  const year = refDate.getFullYear();
  const months: { dates: string[]; label: string }[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 15);
    const refStr = d.toISOString().split("T")[0];
    months.push({
      dates: getMonthDates(refStr),
      label: d.toLocaleDateString("en", { month: "short" }),
    });
  }
  return months;
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dayLogs, setDayLogs] = useState<DayLogs>({});
  const [logs, setLogs] = useState<HabitLog>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [weekStart, setWeekStart] = useState(todayStr());
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHabits(getHabits());
    setDayLogs(getDayLogs());
    setLogs(getLogs());
    setGoals(getGoals());
  }, []);

  // ---- Date range derivation ----
  const { dates, label, exportName } = useMemo(() => {
    if (period === "weekly") {
      const ds = getWeekDates(weekStart);
      const f = formatDate(ds[0]);
      const l = formatDate(ds[6]);
      return {
        dates: ds,
        label: `${f.month} ${f.day} – ${l.month} ${l.day}, ${l.year}`,
        exportName: `arbora-weekly-${ds[0]}.pdf`,
      };
    }
    if (period === "monthly") {
      const ref = new Date();
      ref.setMonth(ref.getMonth() + monthOffset);
      const refStr = ref.toISOString().split("T")[0];
      return {
        dates: getMonthDates(refStr),
        label: ref.toLocaleDateString("en", { month: "long", year: "numeric" }),
        exportName: `arbora-monthly-${refStr.slice(0, 7)}.pdf`,
      };
    }
    const ref = new Date();
    ref.setFullYear(ref.getFullYear() + yearOffset);
    const months = getYearMonths(ref);
    const all = months.flatMap((m) => m.dates);
    return {
      dates: all,
      label: `${ref.getFullYear()}`,
      exportName: `arbora-yearly-${ref.getFullYear()}.pdf`,
    };
  }, [period, weekStart, monthOffset, yearOffset]);

  // ---- Aggregations ----
  const totalHabitMins = dates.reduce((s, d) => s + getDayTotalHabitTime(getDayEntry(dayLogs, d)), 0);
  const totalWastedMins = dates.reduce((s, d) => s + getDayTotalWastedTime(getDayEntry(dayLogs, d)), 0);
  const avgCompletion = dates.length
    ? Math.round(dates.reduce((s, d) => s + getDayCompletionRate(getDayEntry(dayLogs, d), habits.length), 0) / dates.length)
    : 0;

  const totalHabitsCompleted = dates.reduce((sum, d) => {
    const e = getDayEntry(dayLogs, d);
    return sum + Object.values(e.habits || {}).filter((h) => h.completed).length;
  }, 0);

  const bestStreak = useMemo(() => {
    let best = 0;
    habits.forEach((h) => {
      const s = getStreak(h.id, logs);
      if (s > best) best = s;
    });
    return best;
  }, [habits, logs]);

  const currentStreak = bestStreak; // best == current top among habits

  // ---- Trend chart data ----
  const trendData = useMemo(() => {
    if (period === "yearly") {
      const ref = new Date();
      ref.setFullYear(ref.getFullYear() + yearOffset);
      const months = getYearMonths(ref);
      return months.map((m) => {
        const productive = m.dates.reduce((s, d) => s + getDayTotalHabitTime(getDayEntry(dayLogs, d)), 0) / 60;
        const wasted = m.dates.reduce((s, d) => s + getDayTotalWastedTime(getDayEntry(dayLogs, d)), 0) / 60;
        const compl = m.dates.length
          ? m.dates.reduce((s, d) => s + getDayCompletionRate(getDayEntry(dayLogs, d), habits.length), 0) / m.dates.length
          : 0;
        return {
          name: m.label,
          productive: Math.round(productive * 10) / 10,
          wasted: Math.round(wasted * 10) / 10,
          completion: Math.round(compl),
        };
      });
    }
    return dates.map((date) => {
      const entry = getDayEntry(dayLogs, date);
      const d = formatDate(date);
      const name = period === "weekly" ? d.weekday.slice(0, 3) : String(d.day);
      return {
        name,
        productive: Math.round(getDayTotalHabitTime(entry) / 60 * 10) / 10,
        wasted: Math.round(getDayTotalWastedTime(entry) / 60 * 10) / 10,
        completion: getDayCompletionRate(entry, habits.length),
      };
    });
  }, [period, dates, dayLogs, habits.length, yearOffset]);

  // ---- Categories ----
  const habitCategoryTotals: Record<string, number> = {};
  const wastedCategoryTotals: Record<string, number> = {};
  dates.forEach((date) => {
    const entry = getDayEntry(dayLogs, date);
    Object.entries(entry.habits || {}).forEach(([habitId, detail]) => {
      const habit = habits.find((h) => h.id === habitId);
      const cat = habit?.category || "Uncategorized";
      habitCategoryTotals[cat] = (habitCategoryTotals[cat] || 0) + (detail.timeSpent || 0);
    });
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

  const topDistraction = wastedPie.sort((a, b) => b.value - a.value)[0];

  // ---- Navigation ----
  const navigate = (dir: -1 | 1) => {
    if (period === "weekly") setWeekStart(addDays(weekStart, dir * 7));
    else if (period === "monthly") setMonthOffset((o) => o + dir);
    else setYearOffset((o) => o + dir);
  };

  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    color: "hsl(var(--popover-foreground))",
    boxShadow: "0 6px 20px hsl(0 0% 0% / 0.15)",
  };

  const activeGoals = goals.filter((g) => g.status === "Active");

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      <div ref={printRef} className="bg-background">

        {/* Header */}
        <div className="gradient-header text-primary-foreground py-4 px-6 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h1 className="text-lg font-bold flex items-center gap-2 justify-center">
                <TrendingUp className="w-5 h-5" /> Reports Dashboard
              </h1>
              <p className="text-sm opacity-80">{label}</p>
            </div>
            <button onClick={() => navigate(1)} className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pill segmented selector */}
        <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
          <div className="inline-flex bg-secondary/50 p-1 rounded-full border border-border relative">
            {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`relative z-10 px-5 py-1.5 text-sm font-medium rounded-full capitalize transition-all duration-300 ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <ExportPDFButton targetRef={printRef} filename={exportName} label="Export PDF" />
        </div>

        {/* Productivity metric cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5 mb-6 animate-fade-in">
          <MetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Habits Completed" value={String(totalHabitsCompleted)} color="text-primary" />
          <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Avg Completion" value={`${avgCompletion}%`} color="text-accent" />
          <MetricCard icon={<Clock className="w-4 h-4" />} label="Productive" value={formatMinutes(totalHabitMins)} color="text-primary" />
          <MetricCard icon={<Clock className="w-4 h-4" />} label="Wasted" value={formatMinutes(totalWastedMins)} color="text-destructive" />
          <MetricCard icon={<Flame className="w-4 h-4" />} label="Best Streak" value={`${bestStreak}d`} color="text-[hsl(var(--streak-glow))]" />
        </div>

        {/* Trend chart */}
        <Card className="border-border bg-card mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
              Productive vs Wasted Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} barGap={4}>
                  <defs>
                    <linearGradient id="rProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(170 65% 55%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(170 60% 38%)" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="rWast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(35 85% 62%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(35 80% 48%)" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
                  <Tooltip cursor={{ fill: "hsl(var(--secondary) / 0.4)" }} contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="productive" fill="url(#rProd)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="wasted" fill="url(#rWast)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Consistency line + Pies */}
        <div className="grid gap-4 md:grid-cols-2 mb-6 animate-fade-in">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Daily Consistency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="rConsist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="completion" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#rConsist)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Habits · by Category
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
        </div>

        {/* Wasted analytics */}
        <div className="grid gap-4 md:grid-cols-3 mb-6 animate-fade-in">
          <Card className="border-border bg-card md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Wasted Time · by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FancyPieChart
                data={wastedPie}
                centerLabel={formatMinutes(totalWastedMins)}
                centerSubLabel="Wasted"
                compact
                height={200}
              />
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Distraction Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Most frequent</p>
                <p className="text-lg font-bold text-destructive">
                  {topDistraction?.name || "—"}
                </p>
                {topDistraction && (
                  <p className="text-xs text-muted-foreground">{formatMinutes(topDistraction.value)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Productive ratio</p>
                <Progress
                  value={
                    totalHabitMins + totalWastedMins > 0
                      ? Math.round((totalHabitMins / (totalHabitMins + totalWastedMins)) * 100)
                      : 0
                  }
                  className="h-2 mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals analytics */}
        <Card className="border-border bg-card mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" /> Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No active goals. Add one in the Goals page.</p>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((g) => {
                  const p = computeGoalProgress(g);
                  return (
                    <div key={g.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{g.emoji}</span>
                          <span className="font-medium">{g.title}</span>
                        </span>
                        <span className="font-bold text-primary">{p}%</span>
                      </div>
                      <Progress value={p} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card className="border-border bg-card hover:scale-[1.02] transition-transform">
      <CardContent className="pt-4 pb-4 text-center">
        <div className={`flex items-center justify-center gap-1 ${color} mb-1`}>
          {icon}
          <p className="text-[10px] uppercase tracking-wider font-semibold">{label}</p>
        </div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

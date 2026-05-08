import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Goal,
  getGoals,
  saveGoals,
  upsertGoal,
  deleteGoal,
  computeGoalProgress,
  goalDaysRemaining,
  PRIORITY_STYLES,
  STATUS_STYLES,
} from "@/lib/goals";
import { getUserId, pushGoalsToCloud, pullGoalsFromCloud, mergeGoals } from "@/lib/cloud-sync";
import { useAuth } from "@/hooks/use-auth";
import AddGoalDialog from "@/components/AddGoalDialog";
import GoalDetailDialog from "@/components/GoalDetailDialog";
import { Target, Calendar } from "lucide-react";

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selected, setSelected] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<"All" | "Active" | "Completed" | "Paused" | "Missed">("All");
  const { user } = useAuth();

  useEffect(() => {
    setGoals(getGoals());
  }, []);

  // When signed in, pull cloud goals and merge so this device sees others' goals.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const uid = await getUserId();
      if (!uid) return;
      const cloud = await pullGoalsFromCloud(uid);
      const merged = mergeGoals(getGoals(), cloud);
      saveGoals(merged);
      setGoals(merged);
    })().catch((e) => console.error("goals pull failed", e));
  }, [user]);

  const refresh = () => setGoals(getGoals());

  const syncCloud = (all: Goal[]) => {
    getUserId().then((uid) => {
      if (uid) pushGoalsToCloud(uid, all).catch((e) => console.error("goals push failed", e));
    });
  };

  const handleAdd = (g: Goal) => {
    const all = [...goals, g];
    saveGoals(all);
    setGoals(all);
    syncCloud(all);
  };

  const handleSave = (g: Goal) => {
    upsertGoal(g);
    refresh();
    setSelected(g);
    syncCloud(getGoals());
  };

  const handleDelete = (id: string) => {
    deleteGoal(id);
    refresh();
    syncCloud(getGoals());
  };

  const visible = filter === "All" ? goals : goals.filter((g) => g.status === filter);

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      <div className="gradient-header text-primary-foreground py-5 px-6 rounded-xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-bold">Goals</h1>
            <p className="text-sm opacity-80">Long-term objectives and progress</p>
          </div>
        </div>
        <AddGoalDialog onAdd={handleAdd} />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["All", "Active", "Completed", "Paused", "Missed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50">
          <CardContent className="py-12 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No goals yet. Create your first long-term objective.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((g) => {
            const progress = computeGoalProgress(g);
            const days = goalDaysRemaining(g);
            return (
              <Card
                key={g.id}
                className="border-border bg-card hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
                onClick={() => setSelected(g)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{g.emoji}</div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">{g.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {g.startDate} → {g.endDate}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[g.status]}`}>
                      {g.status}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-bold text-primary">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[g.priority]}`}>
                      {g.priority}
                    </span>
                    <span className="text-muted-foreground">
                      {days > 0 ? `${days} days left` : days === 0 ? "Today" : `${Math.abs(days)}d overdue`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDetailDialog
        goal={selected}
        onClose={() => setSelected(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

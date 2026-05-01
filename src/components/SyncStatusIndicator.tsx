import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useSyncStatus, formatLastSynced } from "@/hooks/use-sync-status";
import { useAuth } from "@/hooks/use-auth";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function SyncStatusIndicator() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { state: syncState, pending, lastSyncedAt, flushNow, syncing } = useSyncStatus();

  // Re-render every 30s so "x min ago" stays fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  let Icon = CheckCircle2;
  let label = `Synced · ${formatLastSynced(lastSyncedAt)}`;
  let tone = "text-emerald-600 dark:text-emerald-400";

  if (syncState === "offline") {
    Icon = CloudOff;
    label = "Offline · changes queued";
    tone = "text-amber-600 dark:text-amber-400";
  } else if (syncState === "syncing") {
    Icon = RefreshCw;
    label = "Syncing…";
    tone = "text-primary";
  } else if (syncState === "pending") {
    Icon = Cloud;
    label = `${pending} pending`;
    tone = "text-amber-600 dark:text-amber-400";
  } else if (syncState === "error") {
    Icon = AlertCircle;
    label = "Sync error · tap to retry";
    tone = "text-destructive";
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={flushNow}
          disabled={syncing}
          className="hover:bg-muted/50"
          title={lastSyncedAt ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}` : "Not synced yet"}
        >
          <Icon className={`mr-2 h-4 w-4 ${tone} ${syncing ? "animate-spin" : ""}`} />
          {!collapsed && <span className="truncate text-xs">{label}</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

import { useEffect, useState } from "react";
import { Bell, BellOff, LogIn, LogOut, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  enableReminders,
  disableReminders,
  isRemindersEnabled,
  remindersSupported,
  syncHabitsToServiceWorker,
} from "@/lib/local-reminders";
import { getHabits } from "@/lib/habits";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";

export function SidebarReminderControls() {
  const { user, loading } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEnabled(isRemindersEnabled());
  }, []);

  async function handleToggle() {
    if (!remindersSupported()) {
      toast({
        title: "Reminders unavailable",
        description: "This device or browser doesn't support notifications.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        await disableReminders();
        setEnabled(false);
        toast({ title: "Reminders disabled" });
      } else {
        const res = await enableReminders();
        if (!res.ok) {
          toast({
            title: "Couldn't enable reminders",
            description: res.reason,
            variant: "destructive",
          });
        } else {
          // Push the latest habit list to the service worker so it can schedule.
          await syncHabitsToServiceWorker(getHabits());
          setEnabled(true);
          toast({
            title: "Reminders enabled",
            description: "You'll be notified at each habit's reminder time.",
          });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
  }

  if (loading) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleToggle} disabled={busy} className="hover:bg-muted/50">
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : enabled ? (
            <BellOff className="mr-2 h-4 w-4" />
          ) : (
            <Bell className="mr-2 h-4 w-4" />
          )}
          {!collapsed && <span>{enabled ? "Disable reminders" : "Enable reminders"}</span>}
        </SidebarMenuButton>
      </SidebarMenuItem>
      {user ? (
        <SidebarMenuItem>
          <SidebarMenuButton onClick={handleSignOut} className="hover:bg-muted/50">
            <LogOut className="mr-2 h-4 w-4" />
            {!collapsed && <span className="truncate">Sign out</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="hover:bg-muted/50">
            <Link to="/auth">
              <LogIn className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sign in to sync</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}

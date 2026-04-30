import { CalendarDays, BarChart3, TrendingUp, Clock, Sun, Moon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/use-theme";
import { SidebarReminderControls } from "@/components/SidebarReminderControls";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Daily Tracker", url: "/", icon: CalendarDays },
  { title: "Weekly Report", url: "/weekly", icon: BarChart3 },
  { title: "Monthly Report", url: "/monthly", icon: TrendingUp },
  { title: "Wasted Time", url: "/wasted", icon: Clock },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { dark, toggle } = useTheme();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-lg font-bold text-primary tracking-wide px-3 mb-4">
              🌳 Arbora
            </SidebarGroupLabel>
          )}
          {collapsed && (
            <SidebarGroupLabel className="text-lg px-1 mb-4 justify-center">
              🌳
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1">
        <SidebarReminderControls />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggle} className="hover:bg-muted/50">
              {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {!collapsed && <span>{dark ? "Light Mode" : "Dark Mode"}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

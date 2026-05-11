import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Reports from "./pages/Reports";
import WastedTime from "./pages/WastedTime";
import Goals from "./pages/Goals";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="*"
            element={
              <SidebarProvider>
                <div className="min-h-screen flex w-full">
                  <AppSidebar />
                  <div className="flex-1 flex flex-col min-w-0">
                    <header className="flex items-center border-b border-border safe-top safe-x">
                      <div className="h-12 flex items-center w-full">
                        <SidebarTrigger className="ml-2" />
                        <span className="ml-3 text-sm font-semibold text-muted-foreground tracking-wide">Arbora</span>
                      </div>
                    </header>
                    <main className="flex-1 safe-x safe-bottom">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/goals" element={<Goals />} />
                        <Route path="/weekly" element={<Navigate to="/reports" replace />} />
                        <Route path="/monthly" element={<Navigate to="/reports" replace />} />
                        <Route path="/wasted" element={<WastedTime />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </SidebarProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

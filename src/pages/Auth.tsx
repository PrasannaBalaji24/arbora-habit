import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Check your inbox", description: "Confirm your email to finish signing up." });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent", description: "Check your inbox for instructions." });
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Authentication failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: String(result.error), variant: "destructive" });
      setBusy(false);
      return;
    }
    if (result.redirected) return; // browser navigates away
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-primary/5 to-background">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold">🌳 Arbora</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back. Sign in to enable reminders." : "Create an account to sync & enable push reminders."}
          </p>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="text-center text-sm">
          {mode === "signin" ? (
            <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
              Need an account? Sign up
            </button>
          ) : (
            <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
              Have an account? Sign in
            </button>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">
            Continue without an account
          </Link>
        </div>
      </Card>
    </div>
  );
}

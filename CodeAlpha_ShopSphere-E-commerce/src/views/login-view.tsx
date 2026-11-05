"use client";

import { useState, type FormEvent } from "react";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { useUIStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { DEMO_ADMIN, DEMO_CUSTOMER } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginView() {
  const navigate = useUIStore((s) => s.navigate);
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Signed in");
      navigate("home");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not sign in";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function useAdmin() {
    setEmail(DEMO_ADMIN.email);
    setPassword(DEMO_ADMIN.password);
  }

  function useCustomer() {
    setEmail(DEMO_CUSTOMER.email);
    setPassword(DEMO_CUSTOMER.password);
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full rounded-2xl border bg-card shadow-sm p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-warm text-primary-foreground flex items-center justify-center shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your account to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        {/* Demo credentials */}
        <div className="rounded-lg bg-muted/60 border p-3 mt-4 text-xs space-y-1">
          <p className="font-medium text-foreground">
            Demo admin: admin@shopsphere.dev / admin123
          </p>
          <p className="font-medium text-foreground">
            Demo customer: demo@shopsphere.dev / demo123
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={useAdmin}
            >
              Use admin
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={useCustomer}
            >
              Use customer
            </Button>
          </div>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("register")}
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

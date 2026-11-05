"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Sparkles,
  User,
  Mail,
  Loader2,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Package,
  Check,
} from "lucide-react";

import { useUIStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateProfile } from "@/hooks/use-profile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function initialsOf(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileView() {
  const navigate = useUIStore((s) => s.navigate);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Redirect unauthenticated users (avoid navigate during render).
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("login");
    }
  }, [isAuthenticated, navigate]);

  // Pre-fill from session (and keep in sync when session loads/updates).
  useEffect(() => {
    if (user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [user]);

  if (!isAuthenticated || !user) return null;

  const pending = updateProfile.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateProfile.mutate({ name: name.trim(), phone: phone.trim() });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-warm text-primary-foreground flex items-center justify-center shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My account</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and account details.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Left — account info */}
        <div className="rounded-xl border bg-card shadow-sm p-6 flex flex-col items-center text-center">
          <div className="size-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold shadow-sm">
            {initialsOf(user.name)}
          </div>

          <h2 className="mt-4 text-lg font-semibold">{user.name}</h2>
          <p className="text-sm text-muted-foreground break-all">
            {user.email}
          </p>

          <span
            className={
              "mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium " +
              (isAdmin
                ? "bg-warm/15 text-warm"
                : "bg-muted text-muted-foreground")
            }
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="size-3.5" />
                Admin
              </>
            ) : (
              "Customer"
            )}
          </span>

          <div className="mt-6 w-full space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("orders")}
            >
              <Package className="size-4" />
              My orders
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>

        {/* Right — edit profile */}
        <div className="rounded-xl border bg-card shadow-sm p-6">
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update the name and phone number shown on your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="profile-name"
                  type="text"
                  autoComplete="name"
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                placeholder="Optional"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="profile-email"
                  type="email"
                  className="pl-9"
                  value={user.email}
                  disabled
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed.
              </p>
            </div>

            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Save changes
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

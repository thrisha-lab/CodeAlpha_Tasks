"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { api, HttpError } from "@/lib/api";
import type { UserDTO } from "@/types";
import { useCallback } from "react";
import { toast } from "sonner";

export function useAuth() {
  const { data: session, status, update } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const isAuthenticated = status === "authenticated";

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        throw new Error(res?.error || "Invalid email or password");
      }
      await update?.();
      return res;
    },
    [update],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const u = await api.post<UserDTO>("/api/auth/register", {
        name,
        email,
        password,
      }).catch((e) => {
        throw e as HttpError;
      });
      // Auto-login after registration.
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        throw new Error(res?.error || "Account created, but auto-login failed. Please log in.");
      }
      await update?.();
      return u;
    },
    [update],
  );

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    toast.success("Signed out");
  }, []);

  return {
    user,
    status,
    isAuthenticated,
    isAdmin,
    login,
    register,
    logout,
  };
}

"use client";

import { create } from "zustand";

// Single-page-app navigation. The whole storefront lives on `/`.
// We keep a small route descriptor in memory so views can be swapped
// without creating additional Next.js routes (sandbox constraint).

export type RouteName =
  | "home"
  | "products"
  | "product"
  | "cart"
  | "checkout"
  | "order-success"
  | "orders"
  | "order"
  | "profile"
  | "login"
  | "register"
  | "admin";

export interface RouteState {
  name: RouteName;
  // optional params, e.g. { slug } for product, { id } for order, { tab } for admin
  params: Record<string, string>;
}

interface UIState {
  route: RouteState;
  navigate: (name: RouteName, params?: Record<string, string>) => void;
  // theme
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (t: "light" | "dark") => void;
  // mobile nav
  mobileNavOpen: boolean;
  setMobileNav: (open: boolean) => void;
}

const initialRoute: RouteState = { name: "home", params: {} };

function getInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  // Light is the polished, primary experience. Only use dark if the user
  // has explicitly chosen it before — never auto-switch to dark based on
  // OS preference. The toggle remains available for users who want it.
  const stored = window.localStorage.getItem("shopsphere-theme");
  return stored === "dark" ? "dark" : "light";
}

export const useUIStore = create<UIState>((set) => ({
  route: initialRoute,
  navigate: (name, params = {}) => {
    set({ route: { name, params }, mobileNavOpen: false });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  theme: "light",
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
  mobileNavOpen: false,
  setMobileNav: (open) => set({ mobileNavOpen: open }),
}));

function applyTheme(t: "light" | "dark") {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.localStorage.setItem("shopsphere-theme", t);
}

// Initialize theme on client (call once from a provider).
export function initTheme() {
  if (typeof window === "undefined") return;
  const t = getInitialTheme();
  useUIStore.getState().setTheme(t);
}

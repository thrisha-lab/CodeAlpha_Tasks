"use client";

import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  ShieldAlert,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminDashboard } from "./admin-dashboard";
import { AdminProducts } from "./admin-products";
import { AdminOrders } from "./admin-orders";
import { AdminUsers } from "./admin-users";

type AdminTab = "dashboard" | "products" | "orders" | "users";

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "users", label: "Users", icon: Users },
];

export default function AdminView() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useUIStore((s) => s.navigate);
  const route = useUIStore((s) => s.route);

  // Redirect unauthenticated visitors to the login page.
  useEffect(() => {
    if (!isAuthenticated) navigate("login");
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md items-center justify-center px-4 py-20 sm:px-6">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert size={28} />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">Access denied</h1>
              <p className="text-sm text-muted-foreground">
                You need an administrator account to view this area.
              </p>
            </div>
            <Button onClick={() => navigate("home")}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tab = (route.params.tab as AdminTab) || "dashboard";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage products, orders, and users across your store.
        </p>
      </header>

      <nav
        aria-label="Admin sections"
        className="flex flex-wrap gap-2"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Button
              key={t.id}
              variant={active ? "default" : "ghost"}
              size="sm"
              onClick={() => navigate("admin", { tab: t.id })}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              {t.label}
            </Button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "products" && <AdminProducts />}
        {tab === "orders" && <AdminOrders />}
        {tab === "users" && <AdminUsers />}
      </div>
    </div>
  );
}

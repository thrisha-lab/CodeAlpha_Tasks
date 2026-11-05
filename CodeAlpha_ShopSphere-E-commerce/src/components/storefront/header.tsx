"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  Sun,
  Moon,
  Package,
  LayoutDashboard,
  LogOut,
  Heart,
  Sparkles,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/ui-store";
import { useCartStore } from "@/store/cart-store";
import { useCategories } from "@/hooks/use-products";
import { useAuth } from "@/hooks/use-auth";
import { STORE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Header() {
  const navigate = useUIStore((s) => s.navigate);
  const route = useUIStore((s) => s.route);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const cartCount = useCartStore((s) => s.count());
  const { data: catData } = useCategories();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const categories = catData?.data ?? [];

  useEffect(() => {
    if (route.name === "products" && route.params.q !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync input from external navigation
      setSearch(route.params.q);
    }
  }, [route]);

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    navigate("products", { q: search.trim(), category: route.params.category ?? "" });
  }

  const navLinks = [
    { label: "Home", route: "home" as const },
    { label: "Shop All", route: "products" as const },
    { label: "New Arrivals", route: "products" as const, params: { isNew: "true" } },
    { label: "Featured", route: "products" as const, params: { featured: "true" } },
  ];

  function NavButton({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
          active ? "text-primary" : "text-foreground/70",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="border-b px-5 py-4">
              <SheetTitle className="flex items-center gap-2">
                <Store size={18} className="text-primary" />
                {STORE_NAME}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((l) => (
                <Button
                  key={l.label}
                  variant="ghost"
                  className="justify-start"
                  onClick={() =>
                    navigate(l.route, l.params ?? {})
                  }
                >
                  {l.label}
                </Button>
              ))}
              <div className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categories
              </div>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => navigate("products", { category: c.slug })}
                >
                  {c.name}
                </Button>
              ))}
              {isAuthenticated && (
                <>
                  <div className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Account
                  </div>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("orders")}>
                    <Package size={16} /> My Orders
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("profile")}>
                    <User size={16} /> Profile
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" className="justify-start" onClick={() => navigate("admin")}>
                      <LayoutDashboard size={16} /> Admin
                    </Button>
                  )}
                  <Button variant="ghost" className="justify-start text-destructive" onClick={() => logout()}>
                    <LogOut size={16} /> Sign out
                  </Button>
                </>
              )}
              {!isAuthenticated && (
                <>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("login")}>
                    Sign in
                  </Button>
                  <Button variant="ghost" className="justify-start" onClick={() => navigate("register")}>
                    Create account
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <button
          onClick={() => navigate("home")}
          className="flex shrink-0 items-center gap-2"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-warm text-primary-foreground shadow-sm">
            <Sparkles size={18} />
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:inline">
            {STORE_NAME}
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center lg:flex">
          {navLinks.map((l) => (
            <NavButton
              key={l.label}
              label={l.label}
              active={route.name === l.route && JSON.stringify(route.params) === JSON.stringify(l.params ?? {})}
              onClick={() => navigate(l.route, l.params ?? {})}
            />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-primary">
                Categories
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {categories.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => navigate("products", { category: c.slug })}
                >
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Search */}
        <form
          onSubmit={submitSearch}
          className="relative ml-auto hidden flex-1 max-w-sm md:block"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="h-9 rounded-full pl-9"
            aria-label="Search products"
          />
        </form>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account">
                  <User size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("orders")}>
                  <Package size={16} /> My Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("profile")}>
                  <User size={16} /> Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("admin")}>
                    <LayoutDashboard size={16} /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                  <LogOut size={16} /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => navigate("login")}
            >
              Sign in
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate("cart")}
            aria-label="Cart"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <Badge className="absolute -right-1 -top-1 size-5 rounded-full p-0 text-[10px] tabular-nums">
                {cartCount > 99 ? "99+" : cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile search row */}
      <form
        onSubmit={submitSearch}
        className="relative px-4 pb-3 md:hidden"
      >
        <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="h-9 rounded-full pl-9"
          aria-label="Search products"
        />
      </form>
    </header>
  );
}

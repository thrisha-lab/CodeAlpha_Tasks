"use client";

import { Store, Twitter, Instagram, Github, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { useCategories } from "@/hooks/use-products";
import { STORE_NAME, STORE_TAGLINE } from "@/lib/constants";
import { toast } from "sonner";

export function Footer() {
  const navigate = useUIStore((s) => s.navigate);
  const { data: catData } = useCategories();
  const categories = catData?.data ?? [];

  function subscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim();
    if (!email) return;
    toast.success("Thanks for subscribing! Check your inbox for a welcome offer.");
    form.reset();
  }

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand + newsletter */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-warm text-primary-foreground">
                <Store size={18} />
              </span>
              <span className="text-lg font-bold tracking-tight">{STORE_NAME}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              {STORE_TAGLINE}. Thoughtfully sourced goods, fair prices, and
              fast delivery — backed by a 30-day happiness guarantee.
            </p>
            <form onSubmit={subscribe} className="mt-5 flex max-w-sm gap-2">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  required
                  placeholder="Your email"
                  className="h-9 pl-9"
                  aria-label="Email for newsletter"
                />
              </div>
              <Button type="submit" size="sm">
                Subscribe
              </Button>
            </form>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <button className="hover:text-primary" onClick={() => navigate("products")}>
                  All Products
                </button>
              </li>
              {categories.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <button
                    className="hover:text-primary"
                    onClick={() => navigate("products", { category: c.slug })}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><button className="hover:text-primary" onClick={() => navigate("home")}>About Us</button></li>
              <li><button className="hover:text-primary" onClick={() => navigate("products", { featured: "true" })}>Featured</button></li>
              <li><button className="hover:text-primary" onClick={() => navigate("products", { isNew: "true" })}>New Arrivals</button></li>
              <li><button className="hover:text-primary" onClick={() => navigate("orders")}>Track Order</button></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><button className="hover:text-primary" onClick={() => navigate("profile")}>My Account</button></li>
              <li><button className="hover:text-primary" onClick={() => navigate("cart")}>Shopping Cart</button></li>
              <li><button className="hover:text-primary" onClick={() => navigate("home")}>Shipping & Returns</button></li>
              <li><button className="hover:text-primary" onClick={() => navigate("home")}>Contact Us</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {STORE_NAME}.
          </p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Button variant="ghost" size="icon" aria-label="Twitter"><Twitter size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="Instagram"><Instagram size={18} /></Button>
            <Button variant="ghost" size="icon" aria-label="GitHub"><Github size={18} /></Button>
          </div>
        </div>
      </div>
    </footer>
  );
}

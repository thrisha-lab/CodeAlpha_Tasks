"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Lock,
  Wallet,
  CreditCard,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { useUIStore } from "@/store/ui-store";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/hooks/use-auth";
import { useCreateOrder } from "@/hooks/use-products";
import { ProductImage } from "@/components/storefront/product-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
} from "@/lib/constants";
import type { ShippingInfo } from "@/types";

const checkoutSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(4, "Enter a valid phone number"),
  address: z.string().min(5, "Enter your street address"),
  city: z.string().min(2, "Enter your city"),
  state: z.string().min(2, "Enter your state / province"),
  zip: z.string().min(2, "Enter your zip / postal code"),
  country: z.string().min(2, "Enter your country"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutView() {
  const { isAuthenticated, status, user } = useAuth();
  const items = useCartStore((s) => s.items);
  const navigate = useUIStore((s) => s.navigate);
  const { mutateAsync, isPending, isError, error } = useCreateOrder();
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "United States",
    },
  });

  // Guard: empty cart -> redirect to cart (never navigate during render).
  useEffect(() => {
    if (items.length === 0) {
      navigate("cart");
    }
  }, [items.length, navigate]);

  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingTotal =
    itemsTotal >= FREE_SHIPPING_THRESHOLD || itemsTotal === 0
      ? 0
      : SHIPPING_FLAT;
  const taxTotal = Math.round(itemsTotal * TAX_RATE * 100) / 100;
  const total = Math.round((itemsTotal + shippingTotal + taxTotal) * 100) / 100;

  async function onSubmit(values: CheckoutForm) {
    try {
      const order = await mutateAsync({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        shipping: values as ShippingInfo,
        paymentMethod: "cod",
      });
      navigate("order-success", { id: order.id });
    } catch {
      // Error toast already fired by the mutation.
    }
  }

  // Empty cart: redirecting — show a tiny spinner to avoid flash.
  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Wait for the session to resolve before deciding which gate to show.
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not signed in: let the user choose (do NOT auto-redirect).
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 sm:px-6 py-16">
        <Card className="items-center gap-4 py-8">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock size={26} />
          </div>
          <div className="px-6 text-center">
            <h1 className="text-xl font-bold">Please sign in to checkout</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You need an account to place an order. Sign in or create one in
              just a few seconds.
            </p>
          </div>
          <div className="px-6 w-full flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => navigate("login")}
              className="w-full"
            >
              Sign in
              <ArrowRight size={16} />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("register")}
              className="w-full"
            >
              Create account
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { errors } = form.formState;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("cart")}
        className="mb-4 -ml-2"
      >
        <ArrowLeft size={16} />
        Back to cart
      </Button>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Checkout
      </h1>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-6 grid lg:grid-cols-[1fr_400px] gap-8"
      >
        {/* Left: shipping details + payment method */}
        <div className="space-y-6">
          <Card>
            <div className="px-6">
              <h2 className="text-base font-semibold">Shipping details</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ll send your order and confirmation to this address.
              </p>
            </div>

            <div className="mt-5 px-6 grid gap-4">
              <Field
                id="name"
                label="Full name"
                error={errors.name?.message}
              >
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Jane Doe"
                  {...form.register("name")}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  id="email"
                  label="Email"
                  error={errors.email?.message}
                >
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...form.register("email")}
                  />
                </Field>

                <Field
                  id="phone"
                  label="Phone"
                  error={errors.phone?.message}
                >
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 555 000 1234"
                    {...form.register("phone")}
                  />
                </Field>
              </div>

              <Field
                id="address"
                label="Street address"
                error={errors.address?.message}
              >
                <Input
                  id="address"
                  autoComplete="street-address"
                  placeholder="123 Main Street"
                  {...form.register("address")}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  id="city"
                  label="City"
                  error={errors.city?.message}
                >
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    placeholder="Springfield"
                    {...form.register("city")}
                  />
                </Field>

                <Field
                  id="state"
                  label="State / Province"
                  error={errors.state?.message}
                >
                  <Input
                    id="state"
                    autoComplete="address-level1"
                    placeholder="IL"
                    {...form.register("state")}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  id="zip"
                  label="ZIP / Postal code"
                  error={errors.zip?.message}
                >
                  <Input
                    id="zip"
                    autoComplete="postal-code"
                    placeholder="62704"
                    {...form.register("zip")}
                  />
                </Field>

                <Field
                  id="country"
                  label="Country"
                  error={errors.country?.message}
                >
                  <Input
                    id="country"
                    autoComplete="country-name"
                    placeholder="United States"
                    {...form.register("country")}
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-6">
              <h2 className="text-base font-semibold">Payment method</h2>
            </div>

            <div className="mt-4 px-6">
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as "cod" | "card")}
                className="gap-3"
              >
                <label
                  htmlFor="pay-cod"
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/40",
                  )}
                >
                  <RadioGroupItem
                    value="cod"
                    id="pay-cod"
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-primary" />
                      <span className="text-sm font-medium">
                        Cash on delivery (COD)
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Pay with cash when your order arrives.
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="pay-card"
                  className="flex items-start gap-3 rounded-lg border border-dashed border-border p-3 cursor-not-allowed opacity-60"
                >
                  <RadioGroupItem
                    value="card"
                    id="pay-card"
                    disabled
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Credit / Debit card
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Coming soon
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Card payments are not available yet.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </Card>
        </div>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-24 self-start">
          <Card>
            <div className="px-6">
              <h2 className="text-base font-semibold">Order summary</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"} in your
                cart
              </p>
            </div>

            <div className="mt-4 px-6 space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    fallbackSeed={item.slug}
                    className="h-12 w-12 rounded-md border object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} &times; {formatCurrency(item.price)}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 px-6 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(itemsTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">
                  {shippingTotal === 0 ? (
                    <span className="text-primary">FREE</span>
                  ) : (
                    formatCurrency(shippingTotal)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span className="font-medium">{formatCurrency(taxTotal)}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <Truck size={14} className="text-primary" />
                {shippingTotal === 0
                  ? "Free shipping applied"
                  : `Add ${formatCurrency(
                      FREE_SHIPPING_THRESHOLD - itemsTotal,
                    )} more for free shipping`}
              </div>
            </div>

            <div className="mt-5 px-6">
              {isError && (
                <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error instanceof Error
                    ? error.message
                    : "Could not place order. Please try again."}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={isPending}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Placing order…
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Place order
                  </>
                )}
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="text-primary" />
                Secure checkout &middot; Your data is protected
              </p>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

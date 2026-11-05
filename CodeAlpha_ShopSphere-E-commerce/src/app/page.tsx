"use client";

import { useEffect } from "react";
import { Providers } from "@/providers/providers";
import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { useUIStore } from "@/store/ui-store";
import { STORE_NAME } from "@/lib/constants";

import HomeView from "@/views/home-view";
import ProductsView from "@/views/products-view";
import ProductDetailView from "@/views/product-detail-view";
import CartView from "@/views/cart-view";
import CheckoutView from "@/views/checkout-view";
import OrderSuccessView from "@/views/order-success-view";
import OrdersView from "@/views/orders-view";
import OrderDetailView from "@/views/order-detail-view";
import ProfileView from "@/views/profile-view";
import LoginView from "@/views/login-view";
import RegisterView from "@/views/register-view";
import AdminView from "@/views/admin/admin-view";

const TITLES: Record<string, string> = {
  home: `${STORE_NAME} — Curated goods for modern living`,
  products: "Shop — " + STORE_NAME,
  product: "Product — " + STORE_NAME,
  cart: "Your Cart — " + STORE_NAME,
  checkout: "Checkout — " + STORE_NAME,
  "order-success": "Order Confirmed — " + STORE_NAME,
  orders: "My Orders — " + STORE_NAME,
  order: "Order Details — " + STORE_NAME,
  profile: "My Account — " + STORE_NAME,
  login: "Sign In — " + STORE_NAME,
  register: "Create Account — " + STORE_NAME,
  admin: "Admin — " + STORE_NAME,
};

function RouteOutlet() {
  const route = useUIStore((s) => s.route);

  useEffect(() => {
    document.title = TITLES[route.name] ?? STORE_NAME;
  }, [route.name]);

  switch (route.name) {
    case "home":
      return <HomeView />;
    case "products":
      return <ProductsView />;
    case "product":
      return <ProductDetailView />;
    case "cart":
      return <CartView />;
    case "checkout":
      return <CheckoutView />;
    case "order-success":
      return <OrderSuccessView />;
    case "orders":
      return <OrdersView />;
    case "order":
      return <OrderDetailView />;
    case "profile":
      return <ProfileView />;
    case "login":
      return <LoginView />;
    case "register":
      return <RegisterView />;
    case "admin":
      return <AdminView />;
    default:
      return <HomeView />;
  }
}

export default function Home() {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <RouteOutlet />
        </main>
        <Footer />
      </div>
    </Providers>
  );
}

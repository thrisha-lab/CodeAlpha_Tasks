// The storefront API is mounted under /api/products, /api/orders, etc.
// This root /api route returns a small service descriptor for convenience.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "ShopSphere API",
    version: "1.0.0",
    endpoints: [
      "GET  /api/products",
      "GET  /api/products/[id]",
      "GET  /api/products/featured",
      "GET  /api/products/new",
      "GET  /api/categories",
      "POST /api/auth/register",
      "GET  /api/orders",
      "POST /api/orders",
      "GET  /api/orders/[id]",
      "GET  /api/users/me",
      "GET  /api/admin/orders  (admin)",
      "GET  /api/admin/users   (admin)",
    ],
  });
}

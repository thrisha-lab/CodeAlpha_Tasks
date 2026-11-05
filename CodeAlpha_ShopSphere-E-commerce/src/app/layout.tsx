import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopSphere — Curated goods for modern living",
  description:
    "ShopSphere is a full-stack e-commerce demo built with Next.js, Prisma, and JWT auth. Browse products, manage a cart, place orders, and explore an admin dashboard.",
  keywords: [
    "ShopSphere",
    "e-commerce",
    "Next.js",
    "Prisma",
    "full stack",
    "demo store",
  ],
  authors: [{ name: "ShopSphere" }],
  openGraph: {
    title: "ShopSphere",
    description: "A full-stack e-commerce demo store.",
    siteName: "ShopSphere",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopSphere",
    description: "A full-stack e-commerce demo store.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}

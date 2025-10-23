import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Traderiser - Professional Trading Platform",
  description: "Trade binary options, forex, crypto, and synthetic indices with advanced automation",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          {children}
          <Toaster 
            theme="dark"
            richColors
            position="top-right"  // ✅ CHANGED: Top position
            expand={true}
            visibleToasts={3}     // ✅ REDUCED: Max 3 toasts
            closeButton
            toastOptions={{
              duration: 4000,     // ✅ REDUCED: 4s instead of 5s
              style: {
                background: "linear-gradient(to bottom right, #1f2937, #111827)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(20px)",
              },
            }}
          />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
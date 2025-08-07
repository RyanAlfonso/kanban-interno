
import "./globals.css";
import "../styles/custom.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Provider";
import { Toaster } from "@/components/ui/toaster";
import { Roboto } from "next/font/google";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KTodo",
  description: "KTodo is a kanban board for your todos",
};

export default function RootLayout({ children }: { children: JSX.Element }) {
  const loadingFallback = (
    <div className="p-6">
      <Skeleton className="h-8 w-1/2 mb-4" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={roboto.className}>
        <Providers>
          <Suspense fallback={loadingFallback}>
            {children}
          </Suspense>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}

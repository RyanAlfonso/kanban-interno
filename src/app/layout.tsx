import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Provider";
import { Toaster } from "@/components/ui/toaster";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KTodo",
  description: "KTodo is a kanban board for your todos",
};

export default function RootLayout({ children }: { children: JSX.Element }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={roboto.className}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

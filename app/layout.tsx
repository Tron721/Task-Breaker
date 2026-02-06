import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Planner",
  description: "OpenRouter-powered task planner with logical step tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniSplit",
  description: "Lightweight expense splitting for international students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 min-h-screen antialiased">{children}</body>
    </html>
  );
}

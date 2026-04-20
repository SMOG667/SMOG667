import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FASTIBAT — Compta BTP CI",
  description:
    "ERP comptable automatisé pour entreprises BTP en Côte d'Ivoire (SYSCOHADA révisé, DGI-CI).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

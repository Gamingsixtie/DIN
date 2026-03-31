import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "@/components/ui/ClientProviders";

export const metadata: Metadata = {
  title: "DIN - Doelen-Inspanningennetwerk",
  description:
    "Programma Planvorming App \u2014 vertaal doelen naar baten, vermogens en inspanningen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="bg-cito-bg text-gray-900 antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

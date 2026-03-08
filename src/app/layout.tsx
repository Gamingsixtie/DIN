import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DIN - Doelen-Inspanningennetwerk",
  description:
    "Programma Planvorming App — vertaal doelen naar baten, vermogens en inspanningen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="bg-cito-bg text-gray-900 antialiased">{children}</body>
    </html>
  );
}

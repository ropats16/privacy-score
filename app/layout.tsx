import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "sneakpeek · see what your Solana wallet shows",
  description:
    "Audit any Solana wallet. Get a Privacy Score 0 to 100, understand the leaks in plain English, fix them.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col grain relative"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

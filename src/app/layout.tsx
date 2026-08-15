import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/lib/env";
import { ToastProvider } from "@/components/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://depay.app";

export const metadata: Metadata = {
  title: "Depay — Earn weekly by engaging on X",
  description:
    "Complete engagement tasks on X (Twitter) and earn weekly cash rewards. Like, retweet, follow, and get paid.",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "Depay — Earn weekly by engaging on X",
    description: "Complete engagement tasks on X and earn weekly cash rewards.",
    url: appUrl,
    siteName: "Depay",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Depay — Earn weekly by engaging on X",
    description: "Complete engagement tasks on X and earn weekly cash rewards.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:text-sm focus:font-medium">
          Skip to main content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

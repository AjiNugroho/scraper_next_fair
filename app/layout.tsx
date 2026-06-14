import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner"
import { TanstackProvider } from "./TanstackProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Scraper Dashboard",
    template: "%s | Scraper Dashboard",
  },
  description: "A dashboard for managing and monitoring web scrapers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TanstackProvider>
            <TooltipProvider>
              {children}
              <Toaster position="top-center" />
            </TooltipProvider>
          </TanstackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

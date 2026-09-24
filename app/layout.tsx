import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrapingProvider } from "@/contexts/scraping-context";
import GlobalLoadingIndicator from "@/components/global-loading-indicator";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Digimaps - Google Maps Lead Scraper",
  description: "Extract business data from Google Maps with ease. Scrape contact info, locations, and websites effortlessly.",
  openGraph: {
    title: "Digimaps - Google Maps Lead Scraper",
    description: "Extract business data from Google Maps with ease. Scrape contact info, locations, and websites effortlessly.",
    siteName: 'Digimaps',
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Digimaps - Google Maps Lead Scraper",
    description: "Extract business data from Google Maps with ease. Scrape contact info, locations, and websites effortlessly.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={geistSans.className}>
      <body className="min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScrapingProvider>
            <GlobalLoadingIndicator />
            {children}
          </ScrapingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

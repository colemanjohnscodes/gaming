import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Parlor · Coleman Johns",
    template: "%s · The Parlor",
  },
  description: "A Coleman Johns parlor game.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable}`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

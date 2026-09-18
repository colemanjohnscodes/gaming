import type { Metadata, Viewport } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import { ClaimName } from "@/components/ClaimName";
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
  description: "The Parlor · Coleman Johns",
  openGraph: {
    title: "The Parlor · Coleman Johns",
    description: "The Parlor · Coleman Johns",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1210",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable}`}
    >
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <SiteHeader />
        <ClaimName />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-12 lg:py-16">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

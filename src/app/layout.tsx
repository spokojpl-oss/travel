import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import { TravelpayoutsDriveScript } from "@/components/analytics/TravelpayoutsDriveScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://travel.mpai.pl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Travel.app – Planuj wakacje dla rodziny",
    template: "%s · Travel.app",
  },
  description:
    "Travel planner dla rodzin — wyszukuj aktywności, znajdź region, zarezerwuj lot i hotel, zapisz wyjazd i udostępnij rodzinie.",
  applicationName: "Travel.app",
  authors: [{ name: "Travel.app" }],
  creator: "Travel.app",
  keywords: [
    "wakacje",
    "planowanie wyjazdu",
    "rodzina",
    "aktywności",
    "travel planner",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/logo.svg", type: "image/svg+xml" },
      { url: "/icon", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/brand/logo.svg",
        color: "#003faa",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Travel.app",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: siteUrl,
    siteName: "Travel.app",
    title: "Travel.app – Planuj wakacje dla rodziny",
    description:
      "Od aktywności do gotowego folderu wyjazdu — lot, hotel, plan dzień po dniu.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Travel.app — planuj wakacje od aktywności",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel.app – Planuj wakacje dla rodziny",
    description:
      "Od aktywności do gotowego folderu wyjazdu — lot, hotel, plan dzień po dniu.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#003faa" },
    { media: "(prefers-color-scheme: dark)", color: "#001b4a" },
  ],
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <TravelpayoutsDriveScript />
      </head>
      <body className="min-h-full flex flex-col bg-white text-text-primary">
        {children}
      </body>
    </html>
  );
}

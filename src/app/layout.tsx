import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import { TravelpayoutsDriveScript } from "@/components/analytics/TravelpayoutsDriveScript";
import { getLocale } from "@/i18n/get-locale";
import { getMessages } from "@/i18n/messages";
import { LocaleProvider } from "@/i18n/locale-provider";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const m = getMessages(locale);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: m.meta.title,
      template: "%s · Travel.app",
    },
    description: m.meta.description,
    applicationName: "Travel.app",
    authors: [{ name: "Travel.app" }],
    creator: "Travel.app",
    keywords: [
      "wakacje",
      "planowanie wyjazdu",
      "rodzina",
      "aktywności",
      "travel planner",
      "family travel",
      "holiday planning",
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
      locale: locale === "en" ? "en_GB" : "pl_PL",
      url: siteUrl,
      siteName: "Travel.app",
      title: m.meta.title,
      description: m.meta.ogDescription,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: m.meta.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: m.meta.title,
      description: m.meta.ogDescription,
      images: ["/opengraph-image"],
    },
  };
}

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <TravelpayoutsDriveScript />
      </head>
      <body className="min-h-full flex flex-col bg-white text-text-primary">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}

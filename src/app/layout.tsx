import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { getSiteSettings } from "@/lib/db";
import RootLayoutClient from "@/components/RootLayoutClient";
import {
  getSiteUrl, SITE_NAME, SITE_DESCRIPTION, DEFAULT_OG_IMAGE,
  organizationJsonLd, websiteJsonLd, jsonLdScript,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cached for 5 minutes; saveSettingsAction() busts this immediately via revalidatePath.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteUrl();
  return {
    // metadataBase convierte rutas relativas (/api/images/...) en absolutas
    // para canónicas y Open Graph.
    metadataBase: new URL(site),
    title: {
      default: `${SITE_NAME} — Sintonía Total | Radio en Valencia`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    keywords: [
      "Bonchona", "Bonchona 107.1", "radio Valencia", "radio Venezuela",
      "emisora Carabobo", "música en vivo", "radio online", "radio en vivo",
    ],
    authors: [{ name: SITE_NAME, url: site }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "es_VE",
      url: site,
      title: `${SITE_NAME} — Sintonía Total`,
      description: SITE_DESCRIPTION,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Sintonía Total`,
      description: SITE_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    icons: {
      icon: [{ url: "/logos-bonchona/ico.png", type: "image/png" }],
      apple: [{ url: "/logos-bonchona/ico.png" }],
    },
    category: "music",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bonchona-navy text-foreground pb-24`}
        suppressHydrationWarning
      >
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}

        {/* Identidad de la emisora para buscadores y motores generativos. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript([organizationJsonLd(), websiteJsonLd()]),
          }}
        />

        <RootLayoutClient settings={settings}>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}

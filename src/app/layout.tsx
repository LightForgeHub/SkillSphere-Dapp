import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Work_Sans,
  Jersey_10, Space_Grotesk, Space_Mono
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import NavBar from "@/components/home/layout/navbar";
import Footer from "@/components/layout/Footer";
import AppLayout from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WalletProvider } from "@/providers/WalletProvider";
import { ModalProvider } from "@/providers/ModalProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import OnboardingTour from "@/components/layout/OnboardingTour";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: "400"
})

const SpaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: "400"
})


const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
});

const Jeysey10 = Jersey_10({
  variable: "--font-jersey-10",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "SkillSphere",
    template: "%s | SkillSphere",
  },
  description:
    "Peer-to-peer knowledge marketplace with real-time per-second streaming payments on Stellar.",
  manifest: "/manifest.json",
  applicationName: "SkillSphere",
  keywords: ["knowledge marketplace", "experts", "Stellar", "streaming payments", "Web3"],
  authors: [{ name: "LightForgeHub", url: "https://github.com/LightForgeHub" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SkillSphere",
    startupImage: [
      {
        url: "/icons/pwa/icon-512x512.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SkillSphere",
    title: "SkillSphere – Real-Time Knowledge Marketplace",
    description:
      "Connect with verified experts and pay only per second on Stellar. No subscriptions, no platform fees.",
    images: [{ url: "/icons/pwa/icon-512x512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "SkillSphere",
    description: "Real-time, per-second knowledge marketplace on Stellar.",
    images: ["/icons/pwa/icon-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/pwa/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/pwa/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/pwa/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/pwa/icon-96x96.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${SpaceGrotesk.variable} ${spaceMono.variable} ${workSans.variable} ${inter.variable} ${Jeysey10.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <WalletProvider>
              <ModalProvider>
                <OnboardingProvider>
                  <OnboardingTour />
                  <AppLayout
                    headerSlot={<NavBar />}
                    footerSlot={<Footer />}
                  >
                    {children}
                  </AppLayout>
                </OnboardingProvider>
              </ModalProvider>
            </WalletProvider>
          </QueryProvider>
        </ThemeProvider>
        {/* Register service worker after page is interactive */}
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

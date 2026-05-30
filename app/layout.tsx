import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://doko-chika.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "どこ近？",
    template: "%s | どこ近？",
  },
  description:
    "近い場所を、距離レーダーで比べよう。当番医・薬局・体育館・旅行スポットなど複数の候補を地図レーダーで距離と方向を一覧比較。AIが画像・テキストから施設一覧を自動読み取り。",
  keywords: [
    "距離比較", "レーダー", "当番医", "当番薬局", "休日診療", "夜間診療",
    "施設検索", "最寄り", "どこが近い", "旅行", "体育館", "訪問看護",
    "メディリアライズ", "medirealize",
  ],
  authors: [{ name: "メディリアライズ", url: "https://medirealize.jp/" }],
  creator: "メディリアライズ",
  publisher: "メディリアライズ",
  manifest: "/manifest.json",
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: BASE_URL,
    siteName: "どこ近？",
    title: "どこ近？ — 近い場所を、距離レーダーで比べよう",
    description:
      "当番医・薬局・体育館・旅行スポットなど複数の候補を距離レーダーで比較。AIが当番表の画像やテキストリストを自動解析。",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "どこ近？ アプリアイコン",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "どこ近？ — 近い場所を、距離レーダーで比べよう",
    description:
      "当番医・薬局・体育館・旅行スポットなど複数の候補を距離レーダーで比較。AIが当番表を自動解析。",
    images: ["/icon-512.png"],
    creator: "@medirealize",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "どこ近？",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "どこ近？",
  url: BASE_URL,
  description:
    "近い場所を、距離レーダーで比べよう。当番医・薬局・体育館・旅行スポットなど複数の候補を地図レーダーで距離と方向を一覧比較。",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
  author: {
    "@type": "Organization",
    name: "メディリアライズ",
    url: "https://medirealize.jp/",
  },
  inLanguage: "ja",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="どこ近？" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

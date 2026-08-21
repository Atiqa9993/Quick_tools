import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://quicktools.dev"),
  title: {
    default: "QuickTools — All your everyday tools, in one place",
    template: "%s | QuickTools",
  },
  description:
    "Simple, fast, and free online utilities for professionals and everyday users. PDF tools, image tools, text & OCR, converters — all in your browser. No sign-up required.",
  keywords: [
    "online tools",
    "PDF tools",
    "image compressor",
    "OCR",
    "handwriting to text",
    "PDF to Word",
    "unit converter",
    "QR code generator",
    "free online utilities",
  ],
  authors: [{ name: "QuickTools" }],
  creator: "QuickTools",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "QuickTools",
    title: "QuickTools — All your everyday tools, in one place",
    description:
      "Simple, fast, and free online utilities for professionals and everyday users. No sign-up required.",
    url: "https://quicktools.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuickTools — All your everyday tools, in one place",
    description:
      "Free online PDF, image, OCR, and converter tools — fast, private, no sign-up.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Inter + JetBrains Mono from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap"
          rel="stylesheet"
        />
        {/* Material Symbols */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

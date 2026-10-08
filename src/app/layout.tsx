import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const SITE_URL = "https://quierocafe.vercel.app";
const SITE_TITLE = "Quiero Café — Precios de café de especialidad en Argentina";
const SITE_DESCRIPTION =
  "Compará precios por kilo de café de especialidad de tostadores argentinos: marcas, orígenes y moliendas en un solo lugar, con datos actualizados a diario desde las tiendas de cada tostador.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Quiero Café",
  keywords: [
    "café de especialidad",
    "café por kilo",
    "precio café por kilo",
    "tostadores argentinos",
    "comparador de café",
    "café Colombia",
    "café Etiopía",
    "café Brasil",
    "café Bolivia",
    "comprar café especial Argentina",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Quiero Café",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

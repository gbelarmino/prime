import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PrimeReactProvider } from "primereact/api";
import { Toaster } from "sonner";
import { GlobalSpinner } from "@/components/ui/GlobalSpinner";

// PrimeReact Styles
import "primereact/resources/themes/lara-dark-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aires - Prime",
  description: "Sistema de Gestão Imobiliária com PrimeReact",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#020817] text-slate-50">
        <PrimeReactProvider value={{ ripple: true }}>
          {children}
          <Toaster richColors position="top-right" />
          <GlobalSpinner />
        </PrimeReactProvider>
      </body>
    </html>
  );
}

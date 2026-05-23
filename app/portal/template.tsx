import { Fraunces, Instrument_Sans } from "next/font/google";
import "./portal.css";

const portalDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-portal-display",
  weight: ["500", "600", "700"],
});

const portalBody = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-portal-body",
  weight: ["400", "500", "600"],
});

export default function PortalTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${portalDisplay.variable} ${portalBody.variable} portal-root min-h-screen font-[family-name:var(--font-portal-body)] text-[var(--portal-text)] antialiased`}
    >
      {children}
    </div>
  );
}

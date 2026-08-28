import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/providers/SettingsProvider";

export const metadata: Metadata = {
  title: "MIRYEO K-Beauty Growth AX",
  description:
    "판매·재고·생산·고객 데이터를 하나로 연결하고, AI가 다음 성장 행동을 제안하는 K-Beauty 운영 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-ax-theme="deep-navy">
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}

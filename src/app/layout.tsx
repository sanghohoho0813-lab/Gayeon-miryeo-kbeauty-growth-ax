import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { DeviceViewProvider } from "@/components/device/DeviceView";

export const metadata: Metadata = {
  title: "MIRYEO K-Beauty Growth AX",
  description: "판매·재고·생산·고객 데이터를 하나로 연결하고, AX 판단이 사람의 행동과 실증으로 이어지는 K-Beauty 운영 시스템",
  openGraph: {
    title: "MIRYEO K-Beauty Growth AX",
    description: "MIRYEO Business AX + MIRYEO AI Beauty",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-ax-theme="deep-navy" suppressHydrationWarning>
      <body>
        <SettingsProvider>
          <DeviceViewProvider>{children}</DeviceViewProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

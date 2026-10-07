import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { DeviceViewProvider } from "@/components/device/DeviceView";
import { SETTINGS_BOOT_SCRIPT } from "@/lib/themes";

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
      <head>
        {/* 저장된 화면 설정을 첫 화면 전에 적용 (DECISIONS D-041) */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
      </head>
      <body>
        <SettingsProvider>
          <DeviceViewProvider>{children}</DeviceViewProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

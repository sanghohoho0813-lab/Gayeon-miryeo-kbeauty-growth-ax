import type { Metadata } from "next";
import { Sidebar } from "@/components/ax/Sidebar";
import { UtilityHeader } from "@/components/ax/UtilityHeader";
import { MobileBottomNav } from "@/components/ax/MobileBottomNav";
import { Tutorial } from "@/components/ax/Tutorial";
import { AxGate } from "@/components/ax/AxGate";
import { ToastHost } from "@/components/ax/Toast";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { DataProvider } from "@/components/providers/DataProvider";

// 화면마다 제목 (PASS 40, D-145) — 각 경로의 layout.tsx가 '%s'를 채운다. 대시보드는 기본값
export const metadata: Metadata = {
  title: { default: "대시보드 · MIRYEO Business AX", template: "%s · MIRYEO Business AX" },
  description: "가연인터내셔널 내부 운영 시스템 — 판매·재고·생산·채널·고객 데이터와 AX Action·실증",
};

export default function AxLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DataProvider>
        <div className="min-h-screen bg-bg">
          {/* 키보드: 첫 Tab에서 메뉴(15개+)를 건너뛰고 본문으로 (PASS 40, D-145) */}
          <a href="#main" className="skip-link" data-testid="skip-link">본문으로 건너뛰기</a>
          <Sidebar />
          <div className="lg:pl-[280px] print:!pl-0">
            <UtilityHeader />
            <main id="main" tabIndex={-1} className="@container px-4 pb-24 pt-6 outline-none lg:px-8 lg:pb-12 print:!p-0">
              <AxGate>{children}</AxGate>
            </main>
          </div>
          <MobileBottomNav />
          <Tutorial />
          <ToastHost />
        </div>
      </DataProvider>
    </SessionProvider>
  );
}

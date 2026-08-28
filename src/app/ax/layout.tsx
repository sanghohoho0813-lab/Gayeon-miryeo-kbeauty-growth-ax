import type { Metadata } from "next";
import { Sidebar } from "@/components/ax/Sidebar";
import { UtilityHeader } from "@/components/ax/UtilityHeader";
import { MobileBottomNav } from "@/components/ax/MobileBottomNav";
import { WelcomeModal } from "@/components/ax/WelcomeModal";

export const metadata: Metadata = {
  title: "MIRYEO Business AX",
  description: "가연인터내셔널 내부 운영 시스템 — 판매·재고·생산·채널 데이터 통합 대시보드",
};

export default function AxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="lg:pl-[280px]">
        <UtilityHeader />
        <main className="px-4 pb-24 pt-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileBottomNav />
      <WelcomeModal />
    </div>
  );
}

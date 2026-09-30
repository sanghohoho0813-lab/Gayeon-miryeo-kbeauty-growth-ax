import type { Metadata } from "next";
import { Sidebar } from "@/components/ax/Sidebar";
import { UtilityHeader } from "@/components/ax/UtilityHeader";
import { MobileBottomNav } from "@/components/ax/MobileBottomNav";
import { Tutorial } from "@/components/ax/Tutorial";
import { AxGate } from "@/components/ax/AxGate";
import { ToastHost } from "@/components/ax/Toast";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { DataProvider } from "@/components/providers/DataProvider";

export const metadata: Metadata = {
  title: "MIRYEO Business AX",
  description: "가연인터내셔널 내부 운영 시스템 — 판매·재고·생산·채널·고객 데이터와 AX Action·실증",
};

export default function AxLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DataProvider>
        <div className="min-h-screen bg-bg">
          <Sidebar />
          <div className="lg:pl-[280px]">
            <UtilityHeader />
            <main className="@container px-4 pb-24 pt-6 lg:px-8 lg:pb-12">
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

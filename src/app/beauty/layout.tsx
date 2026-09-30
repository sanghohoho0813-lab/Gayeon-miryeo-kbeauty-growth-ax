import type { Metadata } from "next";
import { BeautyHeader } from "@/components/beauty/BeautyHeader";
import { BeautyFooter } from "@/components/beauty/BeautyFooter";
import { BeautyDataProvider } from "@/components/beauty/BeautyDataProvider";
import { BeautyGate } from "@/components/beauty/BeautyGate";
import { CustomerSessionProvider } from "@/components/beauty/CustomerSession";

export const metadata: Metadata = {
  title: "MIRYEO AI Beauty",
  description: "피부 고민을 선택하면 MIRYEO 제품과 데일리 루틴을 추천해 드립니다.",
  openGraph: { title: "MIRYEO AI Beauty", description: "AI가 이해하는 나의 피부, MIRYEO가 제안하는 나만의 루틴", type: "website" },
};

export default function BeautyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="beauty-scope min-h-screen">
      <BeautyDataProvider>
       <CustomerSessionProvider>
        <BeautyHeader />
        <main className="@container mx-auto w-full max-w-[1240px] px-4 pb-24 md:px-6">
          <BeautyGate>{children}</BeautyGate>
        </main>
        <BeautyFooter />
       </CustomerSessionProvider>
      </BeautyDataProvider>
    </div>
  );
}

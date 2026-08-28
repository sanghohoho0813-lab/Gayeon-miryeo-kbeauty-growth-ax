import type { Metadata } from "next";
import { BeautyHeader } from "@/components/beauty/BeautyHeader";
import { BeautyFooter } from "@/components/beauty/BeautyFooter";

export const metadata: Metadata = {
  title: "MIRYEO AI Beauty",
  description: "AI가 이해하는 나의 피부. MIRYEO가 제안하는 나만의 아름다움.",
};

export default function BeautyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="beauty-scope min-h-screen">
      <BeautyHeader />
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 md:px-6">{children}</main>
      <BeautyFooter />
    </div>
  );
}

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ax/PageHeader";
import { Tabs } from "@/components/ax/Tabs";
import { PermissionNotice } from "@/components/ax/PermissionNotice";
import { BusinessReportView } from "@/components/ax/BusinessReportView";
import { InspectionGuide } from "@/components/ax/InspectionGuide";
import { useSession } from "@/components/providers/SessionProvider";
import { can } from "@/lib/permissions";

/* 사업화·현장확인 (계약 별지 제2호 3단계: 정책자금·보증용 사업화자료, 담당자 면담/현장확인 대비) */
const TABS = [
  { id: "report", label: "사업화 실적 자료" },
  { id: "inspection", label: "면담·현장확인 대비" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Inner() {
  const { role } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const tab: TabId = params.get("tab") === "inspection" ? "inspection" : "report";
  if (!can(role, "view_financials")) return <PermissionNotice role={role} what="사업화·현장확인 자료" />;
  return (
    <div className="mx-auto max-w-[1000px]">
      <div data-print="hide">
        <PageHeader title="사업화·현장확인" description="정책자금·보증·벤처 신청에 붙일 실적 근거와, 담당자 면담·현장확인 때 실제 화면으로 보여줄 순서를 준비합니다." />
        <Tabs tabs={TABS} value={tab} onChange={(t) => router.replace(`/ax/business?tab=${t}`, { scroll: false })} />
      </div>
      {tab === "report" ? <BusinessReportView /> : <InspectionGuide />}
    </div>
  );
}

export default function BusinessPage() {
  return <Suspense><Inner /></Suspense>;
}

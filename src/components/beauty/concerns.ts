import { Droplets, Leaf, Zap, Layers, Sun, CalendarHeart, type LucideIcon } from "lucide-react";
import type { SkinConcern } from "@/lib/types";

export const CONCERNS: { id: SkinConcern; label: string; icon: LucideIcon; desc: string }[] = [
  { id: "수분", label: "수분 부족", icon: Droplets, desc: "당김 없이 촉촉하게" },
  { id: "진정", label: "진정 케어", icon: Leaf, desc: "예민해진 피부 편안하게" },
  { id: "탄력", label: "탄력 케어", icon: Zap, desc: "탄탄한 피부 결" },
  { id: "피부결", label: "결 & 모공", icon: Layers, desc: "매끈한 피부 표면" },
  { id: "광채", label: "광채 케어", icon: Sun, desc: "맑고 환한 톤" },
  { id: "데일리 케어", label: "데일리 케어", icon: CalendarHeart, desc: "매일의 기본 루틴" },
];

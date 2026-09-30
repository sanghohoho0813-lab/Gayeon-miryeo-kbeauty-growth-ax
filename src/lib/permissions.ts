import type { Role } from "./types";

/* Role 권한 — Live에서는 RLS(003_rls.sql)가 최종 방어선, 화면은 같은 규칙으로 메뉴·버튼을 숨긴다. */

export type Permission =
  | "view_financials"
  | "view_commercial" // 채널·B2B·수출 메뉴
  | "edit_master"
  | "edit_operational" // 재고·판매 입력
  | "approve_action"
  | "execute_action"
  | "confirm_proof"
  | "manage_org";

const MATRIX: Record<Permission, Role[]> = {
  view_financials: ["OWNER", "ADMIN"],
  view_commercial: ["OWNER", "ADMIN"],
  edit_master: ["OWNER", "ADMIN"],
  edit_operational: ["OWNER", "ADMIN", "STAFF"],
  approve_action: ["OWNER", "ADMIN"],
  execute_action: ["OWNER", "ADMIN", "STAFF"],
  confirm_proof: ["OWNER"],
  manage_org: ["OWNER"],
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  view_financials: "매출·원가·마진 열람",
  view_commercial: "채널·B2B·수출 메뉴",
  edit_master: "상품·채널·거래처 수정",
  edit_operational: "재고·판매 입력",
  approve_action: "Action 승인·담당 지정",
  execute_action: "Action 실행·결과 기록",
  confirm_proof: "실증 결과 확정",
  manage_org: "조직·기술자산·실증 설정",
};

export const ROLE_LABEL: Record<Role, string> = { OWNER: "대표", ADMIN: "관리자", STAFF: "직원" };

export function can(role: Role, p: Permission): boolean {
  return MATRIX[p].includes(role);
}

export const ALL_PERMISSIONS = Object.keys(MATRIX) as Permission[];

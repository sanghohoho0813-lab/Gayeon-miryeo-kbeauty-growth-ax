import type { Channel, InputCycle, SalesRecord } from "./types";
import { daysBetween } from "./date";

/* 채널별 판매 입력 주기 (PASS 27, R-24, D-086)
   D-053은 조직 전체의 마지막 판매일로 '최근 4주'를 끊었다. 도매·수출처럼 판매를 주·월 단위로 몰아 올리는 채널은
   다른 채널보다 입력이 늦어, 아직 입력하지 않은 날이 0으로 세어져 최근 매출이 낮게·성장률이 음수로 보인다.
   → 대표가 채널마다 입력 주기를 정하면 그 채널은 자기 마지막 입력 기준으로 4주를 계산한다.
   판매 행이 없는 날이 '판매 없음'인지 '아직 입력 안 함'인지는 자료만으로 알 수 없어 자동으로 추정하지 않는다
   (기본 = 매일 = 지금과 같은 계산). 재고·착수 마감·정산 연체 등은 계속 오늘 기준. */

export const INPUT_CYCLES: Record<InputCycle, { label: string; short: string; help: string; /** 조직 기준일보다 이 일수까지 늦어도 정상 — 넘으면 '입력 확인' */ grace: number }> = {
  daily: { label: "매일 (기본)", short: "매일", help: "쇼핑몰·자사몰처럼 매일 또는 며칠마다 올리는 채널 — 조직 전체의 마지막 판매일까지로 계산", grace: 0 },
  weekly: { label: "주 1회 몰아서", short: "주 1회", help: "한 주치를 모아 올리는 채널 — 이 채널의 마지막 판매일까지로 계산 (13일 넘게 입력이 없으면 '입력 확인')", grace: 13 },
  monthly: { label: "월 1회 몰아서", short: "월 1회", help: "도매·수출처럼 한 달치를 모아 올리는 채널 — 마지막으로 입력한 달의 말일까지로 계산 (45일 넘게 입력이 없으면 '입력 확인')", grace: 45 },
};
export const INPUT_CYCLE_IDS = Object.keys(INPUT_CYCLES) as InputCycle[];
export const cycleOf = (c?: Pick<Channel, "inputCycle"> | null): InputCycle => (c?.inputCycle && c.inputCycle in INPUT_CYCLES ? c.inputCycle : "daily");

export interface ChannelAsOf {
  channelId: string;
  cycle: InputCycle;
  /** 이 채널의 '최근 4주' 끝 날 */
  asOf: string;
  /** 이 채널의 마지막 판매일 (오늘 이후 날짜 제외) */
  lastSale: string | null;
  /** 조직 기준일보다 며칠 앞에서 끊었는지 (0 = 같음) */
  lagDays: number;
  /** 입력 주기를 넘겨 입력이 없음 → 조직 기준일로 계산하고 '입력 확인' 표시 */
  stale: boolean;
}

const monthEnd = (iso: string) => {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};

/** orgAsOf: 조직 전체 마지막 판매일(D-053) · today: 오늘 (이후 날짜는 오타로 보고 제외) */
export function resolveChannelAsOf(channels: Channel[], sales: SalesRecord[], orgAsOf: string, today: string): Map<string, ChannelAsOf> {
  const last = new Map<string, string>();
  for (const s of sales) if (s.saleDate <= today && s.saleDate > (last.get(s.channelId) ?? "")) last.set(s.channelId, s.saleDate);
  return new Map(channels.map((c) => {
    const cycle = cycleOf(c);
    const lastSale = last.get(c.id) ?? null;
    let asOf = orgAsOf;
    let stale = false;
    if (cycle !== "daily" && lastSale && lastSale < orgAsOf) {
      if (daysBetween(lastSale, orgAsOf) > INPUT_CYCLES[cycle].grace) stale = true;
      // 월 1회: 지난달까지 올렸으면 그달 말일까지(말일 전 며칠 판매가 없어도 입력은 끝난 달), 이번 달 일부를 올렸으면 마지막 판매일까지
      else if (cycle === "monthly" && monthEnd(lastSale) < orgAsOf) asOf = monthEnd(lastSale);
      else asOf = lastSale;
    }
    return [c.id, { channelId: c.id, cycle, asOf, lastSale, lagDays: daysBetween(asOf, orgAsOf), stale }] as const;
  }));
}

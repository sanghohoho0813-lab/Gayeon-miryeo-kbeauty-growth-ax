"use client";

import { Download } from "lucide-react";
import { downloadCSV, type CsvRow } from "@/lib/export";
import { todayISO } from "@/lib/date";
import { isLive } from "@/lib/config";

/** CSV 내보내기 버튼 — 파일명: miryeo_{file}_날짜(_DEMO).csv
 *  파일명은 영문(file): 일부 브라우저·OS에서 한글 파일명이 "download"로 바뀌는 문제 방지. name은 화면·식별용 */
export function ExportButton({ name, file, rows, label = "CSV 내보내기", disabled }: { name: string; file: string; rows: CsvRow[] | (() => CsvRow[]); label?: string; disabled?: boolean }) {
  return (
    <button
      className="btn-secondary !min-h-[40px] text-[0.86rem]"
      disabled={disabled}
      data-export={name}
      onClick={() => {
        const data = typeof rows === "function" ? rows() : rows;
        downloadCSV(`miryeo_${file}_${todayISO()}${isLive ? "" : "_DEMO"}.csv`, data);
      }}
    >
      <Download size={15} aria-hidden /> {label}
    </button>
  );
}

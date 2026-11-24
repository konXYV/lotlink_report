// lib/clPrizeMatchCore.ts
// ─── ແກນຄິດໄລ່ ໜ້າ "ກະທົບຍ່ອຍ ລາງວັນ CL" (ລະບົບ CL_LOTTO_REWARD ທຽບ Statement CL_BCEL_STMT 0101300016635) ───
import type { PrizeMatchRow, MatchStatus } from "@/app/api/oracle/CL_prize_match/prize_match.repo";
import { SVC_LABEL } from "./lottoReportCore";

export type { PrizeMatchRow, MatchStatus };
export type MatchTab = "ALL" | "DOG" | "PUP";
export const ACCT_PRIZE_OUT = "0101300016635";
export { SVC_LABEL };

export const STATUS_LABEL: Record<MatchStatus, string> = {
  MATCH: "ກົງກັນ",
  DIFF: "ຍອດບໍ່ກົງ",
  NOT_PAID: "ຍັງບໍ່ມີໃນ Statement",
  NOT_IN_SYSTEM: "ມີໃນ Statement ບໍ່ມີໃນລະບົບ",
};

export interface MatchSummary {
  bills: number;
  sysAmt: number;
  bankAmt: number;
  feeAmt: number;
  taxAmt: number;
  diff: number;
  count: Record<MatchStatus, number>;
  amount: Record<MatchStatus, number>; // ຜົນລວມ DIFF ຕໍ່ສະຖານະ
}

export const filterByTab = (rows: PrizeMatchRow[], tab: MatchTab) =>
  tab === "ALL" ? rows : rows.filter((r) => r.SVC === tab);

export function summarize(rows: PrizeMatchRow[]): MatchSummary {
  const s: MatchSummary = {
    bills: rows.length,
    sysAmt: 0,
    bankAmt: 0,
    feeAmt: 0,
    taxAmt: 0,
    diff: 0,
    count: { MATCH: 0, DIFF: 0, NOT_PAID: 0, NOT_IN_SYSTEM: 0 },
    amount: { MATCH: 0, DIFF: 0, NOT_PAID: 0, NOT_IN_SYSTEM: 0 },
  };
  for (const r of rows) {
    s.sysAmt += r.SYS_AMT;
    s.bankAmt += r.BANK_AMT;
    s.feeAmt += r.FEE_AMT;
    s.taxAmt += r.TAX_AMT;
    s.count[r.STATUS]++;
    s.amount[r.STATUS] += r.DIFF;
  }
  s.diff = Math.round((s.sysAmt - s.bankAmt) * 100) / 100;
  return s;
}

export { fmt2, isOff, dayLabel } from "./clSalesPrizeCore";

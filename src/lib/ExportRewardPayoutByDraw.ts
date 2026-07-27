// lib/ExportRewardPayoutByDraw.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ລາຍງານຍອດຈ່າຍລາງວັນແຕ່ລະງວດ (LOTLINK_REWARD ⇄ LOTLINK_PAYOUT)
//  ຮູບແບບ: ຄືກັນກັບ Excel ຕົ້ນສະບັບຂອງຜູ້ໃຊ້ — 1 ງວດ = 1 block:
//    ແຖວທຳອິດ: ວັນທີ | ງວດ(reward) | ຈຳນວນເງິນຖືກລາງວັນ | ຈຳນວນບິນຖືກລາງວັນ | ງວດ(payout) | ຈຳນວນເງີນ | ຈຳນວນເບີກຈ່າຍ | ວັນທີເບີກຈ່າຍ
//    ແຖວຕໍ່ໆໄປ (ຖ້າຈ່າຍຫລາຍວັນ): A-D ຫວ່າງ, ມີແຕ່ E-H (payout ແຕ່ລະຄັ້ງ)
//    ແຖວ "ລວມ": SUM ຂອງ payout ທັງໝົດ ໃນງວດນັ້ນ + ຈຳນວນມື້ນັບແຕ່ວັນອອກງວດ
//
//  ສີແຖວ "ລວມ":
//   - ຂຽວ    : ຍອດ REWARD == ຍອດ PAYOUT ລວມ (ຈ່າຍຄົບແລ້ວ)
//   - ເຫລືອງ  : ງວດຍັງບໍ່ກາຍ 15 ມື້ ນັບແຕ່ວັນອອກງວດ ແລະຍັງບໍ່ຄົບ
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";
import type { DrawGroup } from "@/app/reward_payout_by_draw/page";

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT       = "Phetsarath OT";
const BG_HEADER  = "9DC3E6"; // light blue — header row
const BG_MATCHED = "C6EFCE"; // green — matched draw total row
const BG_RECENT  = "FFF2CC"; // yellow — still within 15 days
const BG_TOTAL   = "D9D9D9"; // grey — grand total row
const LAST_COL   = 10;       // K (index 10) — ລວມທັງ ຄໍລຳ "ລວມອາກອນ 5%" ແລະ 2 ຄໍລຳ "ຜົນຕ່າງ"
const BG_DIFF    = "FFC7CE"; // light red — highlight non-zero diff cells

// ── Border helpers ────────────────────────────────────────────────────────────

type BSide = { color: CellStyleColor; style?: BorderType };
const thin = (): BSide => ({ style: "thin", color: { rgb: "000000" } });
const allThin = (): CellStyle["border"] => ({ left: thin(), right: thin(), top: thin(), bottom: thin() });

// ── Style builders ────────────────────────────────────────────────────────────

function sTitle(sz = 12, bold = false): CellStyle {
  return { font: { name: FONT, sz, bold }, alignment: { horizontal: "center", vertical: "center" } };
}

function sHeader(sz = 11): CellStyle {
  return {
    font: { name: FONT, bold: true, sz },
    fill: { patternType: "solid", fgColor: { rgb: BG_HEADER } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: allThin(),
  };
}

function sData(align: "center" | "right" | "left" = "right", bg?: string, bold = false): CellStyle {
  return {
    font: { name: FONT, sz: 11, bold },
    fill: bg ? { patternType: "solid", fgColor: { rgb: bg } } : undefined,
    alignment: { horizontal: align, vertical: "center" },
    numFmt: "#,##0",
    border: allThin(),
  };
}

function sDataText(align: "center" | "left" = "center", bg?: string, bold = false): CellStyle {
  return {
    font: { name: FONT, sz: 11, bold },
    fill: bg ? { patternType: "solid", fgColor: { rgb: bg } } : undefined,
    alignment: { horizontal: align, vertical: "center" },
    border: allThin(),
  };
}

// ── Cell factories ────────────────────────────────────────────────────────────

function C(v: string | number, s: CellStyle): CellObject {
  return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
}
function CE(s: CellStyle): CellObject {
  return { v: "", t: "s", s } as CellObject;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const parts = String(s).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(s);
}

// ── Sheet builder ─────────────────────────────────────────────────────────────

function buildSheet(rangeDisplay: string, groups: DrawGroup[], printedBy: string): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];

  const S = (r: number, c: number, cl: CellObject) => { ws[XLSXStyle.utils.encode_cell({ r, c })] = cl; };
  const M = (r1: number, c1: number, r2: number, c2: number) => { merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } }); };

  // ── Title ─────────────────────────────────────────────────────────────────
  S(0, 0, C("ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", sTitle(13, false)));
  S(1, 0, C("ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", sTitle(12)));
  S(2, 0, C(`ລາຍງານຍອດຈ່າຍລາງວັນແຕ່ລະງວດ${rangeDisplay ? "  " + rangeDisplay : ""}`, sTitle(13, true)));
  M(0, 0, 0, LAST_COL); M(1, 0, 1, LAST_COL); M(2, 0, 2, LAST_COL);

  S(3, 0, CE(sTitle())); M(3, 0, 3, LAST_COL);

  // ── Header row — ຄືກັນກັບ Excel ຕົ້ນສະບັບ ──────────────────────────────────
  const headers = ["ວັນທີ", "ງວດ", "ຈຳນວນເງິນຖືກລາງວັນ", "ຈຳນວນບິນຖືກລາງວັນ", "ງວດ", "ຈຳນວນເງີນ", "ຈຳນວນເບີກຈ່າຍ", "ວັນທີເບີກຈ່າຍ", "ລວມອາກອນ 5%", "ຜົນຕ່າງ ຈຳນວນເງິນ", "ຜົນຕ່າງ ຈຳນວນ"];
  headers.forEach((h, c) => S(4, c, C(h, sHeader(11))));

  // ── Data rows: 1 block ຕໍ່ 1 ງວດ ─────────────────────────────────────────
  let r = 5;
  let matchedCount = 0;

  for (const g of groups) {
    const rows = g.payouts.length > 0 ? g.payouts : [null];

    rows.forEach((p, idx) => {
      // A-D: ຂໍ້ມູນ reward — ສະແດງສະເພາະແຖວທຳອິດຂອງງວດ
      S(r, 0, C(idx === 0 ? fmtDate(g.DRAWDATE) : "", sDataText("center")));
      S(r, 1, C(idx === 0 ? g.DRAWID : "", sDataText("center", undefined, idx === 0)));
      S(r, 2, idx === 0 ? C(g.REWARD_TOTAL, sData("right")) : CE(sData("right")));
      S(r, 3, idx === 0 ? C(g.REWARD_COUNT, sData("right")) : CE(sData("right")));
      // E-H: ຂໍ້ມູນ payout — ແຕ່ລະຄັ້ງທີ່ຈ່າຍ
      if (p) {
        S(r, 4, C(p.PAYOUT_DRAW_ID ?? "", sDataText("center")));
        S(r, 5, C(p.PAYOUT_TOTAL, sData("right")));
        S(r, 6, C(p.PAYOUT_COUNT, sData("right")));
        S(r, 7, C(fmtDate(p.PAYOUT_DATE), sDataText("center")));
      } else {
        S(r, 4, CE(sDataText("center")));
        S(r, 5, CE(sData("right")));
        S(r, 6, CE(sData("right")));
        S(r, 7, CE(sDataText("center")));
      }
      // I: ລວມອາກອນ 5% / J-K: ຜົນຕ່າງ — ສະແດງສະເພາະແຖວ "ລວມ" ຂອງງວດ, ແຖວລະອຽດປ່ອຍຫວ່າງ
      S(r, 8, CE(sData("right")));
      S(r, 9, CE(sData("right")));
      S(r, 10, CE(sData("right")));
      r++;
    });

    // ── ແຖວ "ລວມ" ຂອງງວດນີ້ — ໄລ້ສີຕາມເງື່ອນໄຂ ──────────────────────────────
    const bg = g.IS_MATCHED ? BG_MATCHED : g.IS_RECENT ? BG_RECENT : undefined;
    if (g.IS_MATCHED) matchedCount++;

    S(r, 0, C("ລວມ", sDataText("center", bg, true)));
    S(r, 1, C(g.DRAWID, sDataText("center", bg, true)));
    S(r, 2, C(g.REWARD_TOTAL, sData("right", bg, true)));
    S(r, 3, C(g.REWARD_COUNT, sData("right", bg, true)));
    S(r, 4, C(g.payouts[0]?.PAYOUT_DRAW_ID ?? "", sDataText("center", bg, true)));
    S(r, 5, C(g.PAYOUT_TOTAL_SUM, sData("right", bg, true)));
    S(r, 6, C(g.PAYOUT_COUNT_SUM, sData("right", bg, true)));
    S(r, 7, C(Number.isFinite(g.DAYS_SINCE_DRAW) ? `${g.DAYS_SINCE_DRAW}ມື້` : "-", sDataText("center", bg, true)));
    const bgDiff      = bg ?? (g.DIFF !== 0 ? BG_DIFF : undefined);
    const bgDiffCount = bg ?? (g.DIFF_COUNT !== 0 ? BG_DIFF : undefined);
    S(r, 8, C(g.TAX_TOTAL, sData("right", bg, true)));
    S(r, 9, C(g.DIFF, sData("right", bgDiff, true)));
    S(r, 10, C(g.DIFF_COUNT, sData("right", bgDiffCount, true)));
    r++;
  }

  // ── ລວມທັງໝົດ (grand total) ──────────────────────────────────────────────
  const sumReward      = groups.reduce((s, g) => s + g.REWARD_TOTAL, 0);
  const sumRewardCount = groups.reduce((s, g) => s + g.REWARD_COUNT, 0);
  const sumPayout      = groups.reduce((s, g) => s + g.PAYOUT_TOTAL_SUM, 0);
  const sumPayoutCount = groups.reduce((s, g) => s + g.PAYOUT_COUNT_SUM, 0);
  const sumTax         = groups.reduce((s, g) => s + g.TAX_TOTAL, 0);
  const sumDiff        = groups.reduce((s, g) => s + g.DIFF, 0);
  const sumDiffCount   = groups.reduce((s, g) => s + g.DIFF_COUNT, 0);

  const rGrand = r;
  S(rGrand, 0, C(`ລວມທັງໝົດ (${matchedCount}/${groups.length} ງວດຄົບຖ້ວນ)`, sDataText("center", BG_TOTAL, true)));
  M(rGrand, 0, rGrand, 1);
  S(rGrand, 2, C(sumReward, sData("right", BG_TOTAL, true)));
  S(rGrand, 3, C(sumRewardCount, sData("right", BG_TOTAL, true)));
  S(rGrand, 4, CE(sDataText("center", BG_TOTAL)));
  S(rGrand, 5, C(sumPayout, sData("right", BG_TOTAL, true)));
  S(rGrand, 6, C(sumPayoutCount, sData("right", BG_TOTAL, true)));
  S(rGrand, 7, CE(sDataText("center", BG_TOTAL)));
  S(rGrand, 8, C(sumTax, sData("right", BG_TOTAL, true)));
  S(rGrand, 9, C(sumDiff, sData("right", BG_TOTAL, true)));
  S(rGrand, 10, C(sumDiffCount, sData("right", BG_TOTAL, true)));
  r++;

  // ── Printed-by ────────────────────────────────────────────────────────────
  let rEnd = rGrand;
  if (printedBy) {
    rEnd = r + 1;
    S(rEnd, 0, C(`ຜູ້ພິມ: ${printedBy}`, { font: { name: FONT, sz: 9, color: { rgb: "555555" } }, alignment: { horizontal: "left", vertical: "center" } }));
    M(rEnd, 0, rEnd, LAST_COL);
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  const rLegend1 = rEnd + 1;
  S(rLegend1, 0, C("■ ຂຽວ = ແຖວລວມ ຍອດຈ່າຍຕົງກັນ (REWARD = PAYOUT)", { font: { name: FONT, sz: 9, color: { rgb: "2E7D32" } }, alignment: { horizontal: "left", vertical: "center" } }));
  M(rLegend1, 0, rLegend1, LAST_COL);
  const rLegend2 = rLegend1 + 1;
  S(rLegend2, 0, C("■ ເຫລືອງ = ງວດຍັງບໍ່ກາຍ 15 ມື້ (ຍັງລໍຖ້າຈ່າຍ)", { font: { name: FONT, sz: 9, color: { rgb: "B8860B" } }, alignment: { horizontal: "left", vertical: "center" } }));
  M(rLegend2, 0, rLegend2, LAST_COL);
  const rLegend3 = rLegend2 + 1;
  S(rLegend3, 0, C("■ ແດງ = ຍັງມີຜົນຕ່າງ (REWARD ≠ PAYOUT)", { font: { name: FONT, sz: 9, color: { rgb: "C00000" } }, alignment: { horizontal: "left", vertical: "center" } }));
  M(rLegend3, 0, rLegend3, LAST_COL);

  // ── Column widths ─────────────────────────────────────────────────────────
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 18 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 14 },
  ];

  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: rLegend3, c: LAST_COL });

  return ws;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function exportRewardPayoutByDraw(
  groups:    DrawGroup[],
  drawFrom:  string,
  drawTo:    string,
  printedBy = "",
): Promise<void> {
  const rangeDisplay = !drawFrom && !drawTo
    ? ""
    : drawFrom === drawTo
      ? `ງວດ ${drawFrom}`
      : `ງວດ ${drawFrom || "ທັງໝົດ"} ຫາ ${drawTo || "ທັງໝົດ"}`;

  const ws = buildSheet(rangeDisplay, groups, printedBy);
  const wb = XLSXStyle.utils.book_new();
  const sheetName = `RewardPayout ${drawFrom || "all"}`.slice(0, 31);
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
  XLSXStyle.writeFile(wb, `RewardPayout_${drawFrom || "all"}_to_${drawTo || "all"}.xlsx`);
}

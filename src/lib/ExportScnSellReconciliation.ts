// lib/ExportScnSellReconciliation.ts
// Export ລາຍງານ ສົມທຽບລາງວັນ SCN (Lotlink / Portal / BCEL Statement) ຕາມງວດ
import * as XLSX from "xlsx-js-style";

export interface ScnLotlinkRewardReconRow {
  DRAW_ID: string;
  DRAW_DATE: string | null;
  LOTLINK_WIN_AMT: number;
  DIRECT_REWARD_AMT: number;
  PROMOTION_REWARD_AMT: number;
  TOTAL_REWARD_AMT: number;
  TAX_5PCT_AMT: number;
  REWARD_AND_TAX: number;
  BCEL_PAYOUT_AMT: number;
  PAYOUT_DIFF: number;
}

const FONT = "Phetsarath OT";
const borderThin = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};
const titleStyle = {
  font: { name: FONT, sz: 14, bold: true },
  alignment: { horizontal: "center", vertical: "center" },
};
const subTitleStyle = {
  font: { name: FONT, sz: 11 },
  alignment: { horizontal: "center", vertical: "center" },
};
const headerStyle = {
  fill: { fgColor: { rgb: "D9D9D9" } },
  font: { name: FONT, sz: 10, bold: true },
  alignment: { vertical: "center", horizontal: "center", wrapText: true },
  border: borderThin,
};
const centerStyle = {
  font: { name: FONT, sz: 10 },
  alignment: { horizontal: "center" },
  border: borderThin,
};
const numStyle = {
  font: { name: "Arial Narrow", sz: 10 },
  alignment: { horizontal: "right" },
  numFmt: "#,##0.00;(#,##0.00)",
  border: borderThin,
};
const totalCenterStyle = {
  ...centerStyle,
  fill: { fgColor: { rgb: "EEEEEE" } },
  font: { name: FONT, sz: 10, bold: true },
};
const totalNumStyle = {
  ...numStyle,
  fill: { fgColor: { rgb: "EEEEEE" } },
  font: { name: "Arial Narrow", sz: 10, bold: true },
};

function buildFilename(title: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const safe = title.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return `${safe}_${dateStr}.xlsx`;
}

function sumBy<T>(rows: T[], key: keyof T): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}


export async function exportScnSellReconciliation(
  rows: ScnLotlinkRewardReconRow[],
  drawFrom?: string,
  drawTo?: string,
) {
  const range =
    drawFrom || drawTo ? ` (ງວດ ${drawFrom || "..."} - ${drawTo || "..."})` : "";
  const title = "ລາຍງານ ສົມທຽບລາງວັນ SCN" + range;
  const NUM_COLS = 10;

  const ws = XLSX.utils.aoa_to_sheet([]);
  ws["!cols"] = [
    { wch: 8 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
  ];
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } }];

  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
  ws["A1"].s = titleStyle;

  const headers = [
    "ງວດ", "ວັນທີ", "ຍອດຖືກລາງວັນລະບົບ Lotlink", "ລາງວັນຕົງ", "ລາງວັນໂປໂມຊັນ",
    "ລວມລາງວັນ", "ອາກອນ 5%", "ລາງວັນ ແລະ ອາກອນ", "ຈ່າຍລາງວັນ Statement", "ຜິດຫນ້າຈ່າຍລາງວັນ",
  ];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A3" });
  headers.forEach((_, c) => {
    ws[XLSX.utils.encode_cell({ r: 2, c })].s = headerStyle;
  });

  const body = rows.map((r) => [
    r.DRAW_ID, r.DRAW_DATE ?? "", r.LOTLINK_WIN_AMT, r.DIRECT_REWARD_AMT,
    r.PROMOTION_REWARD_AMT, r.TOTAL_REWARD_AMT, r.TAX_5PCT_AMT,
    r.REWARD_AND_TAX, r.BCEL_PAYOUT_AMT, r.PAYOUT_DIFF,
  ]);
  XLSX.utils.sheet_add_aoa(ws, body, { origin: "A4" });
  body.forEach((_, i) => {
    for (let c = 0; c < NUM_COLS; c++) {
      ws[XLSX.utils.encode_cell({ r: 3 + i, c })].s = c < 2 ? centerStyle : numStyle;
    }
  });

  if (rows.length > 0) {
    const tr = 3 + rows.length;
    const keys: (keyof ScnLotlinkRewardReconRow)[] = [
      "LOTLINK_WIN_AMT", "DIRECT_REWARD_AMT", "PROMOTION_REWARD_AMT",
      "TOTAL_REWARD_AMT", "TAX_5PCT_AMT", "REWARD_AND_TAX",
      "BCEL_PAYOUT_AMT", "PAYOUT_DIFF",
    ];
    XLSX.utils.sheet_add_aoa(ws, [["ລວມ", "", ...keys.map((k) => sumBy(rows, k))]], {
      origin: XLSX.utils.encode_cell({ r: tr, c: 0 }),
    });
    for (let c = 0; c < NUM_COLS; c++) {
      ws[XLSX.utils.encode_cell({ r: tr, c })].s = c < 2 ? totalCenterStyle : totalNumStyle;
    }
    ws["!merges"].push({ s: { r: tr, c: 0 }, e: { r: tr, c: 1 } });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SCN Reward Recon");
  XLSX.writeFile(wb, buildFilename(title));
}

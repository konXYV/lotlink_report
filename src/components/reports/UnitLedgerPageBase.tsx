"use client";

import { useState, useMemo, useEffect } from "react";
import { FileDown, Printer, BarChart3, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity, type ActivityAction } from "@/lib/activityService";
import UnitLedgerEditor, { type LedgerRow, computeDue } from "./UnitLedgerEditor";
import PayoutByUserSection, { type PayoutUserRow } from "./PayoutByUserSection";
import { exportUnitLedger } from "@/lib/ExportUnitLedger";

export interface UnitLedgerPageConfig {
  pageTitle: string;
  pageSubtitle: string;
  entityLabel: string; // "ໜ່ວຍ" | "ແຂວງ"
  hasRemainingCol: boolean;
  defaultRate: number;
  titleLines: [string, string, string]; // xlsx title block, 3 lines
  fileNamePrefix: string;
  activityExport: ActivityAction;
  activityPrint: ActivityAction;
  /** Which unit_sell_summary query variant feeds the sales table (top table)
   *  for this page — matches a `variant` value the /api/oracle?view=unit_sell_summary
   *  endpoint accepts. ໜ່ວຍ/ແຂວງ ແລະ ຍອດຂາຍ ດຶງມາຈາກ Oracle ໂດຍກົງ, ບໍ່ແມ່ນປ້ອນເອງ. */
  unitSellVariant: "nkl" | "province" | "toubee";
  seedRows?: string[]; // optional starter entity names (used only if the query returns nothing)
}

let rid = 0;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row_${Date.now()}_${rid++}`;

/** "YYYY-MM-DD" -> "DD/MM/YYYY" for display + xlsx export (matches source sheets) */
function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export default function UnitLedgerPageBase({ config }: { config: UnitLedgerPageConfig }) {
  const { user } = useAuth();
  const [periodDate, setPeriodDate] = useState(""); // ISO "YYYY-MM-DD"
  const [rate, setRate] = useState(config.defaultRate);
  const [rows, setRows] = useState<LedgerRow[]>(
    (config.seedRows ?? []).map((name) => ({
      id: newId(),
      name,
      sale: 0,
      transferred: 0,
      remaining: 0,
    })),
  );
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);
  const [payoutRows, setPayoutRows] = useState<PayoutUserRow[]>([]);

  // ── auto-fetch the sales table (ໜ່ວຍ/ແຂວງ + ຍອດຂາຍ) from Oracle ──────────
  // ຕາຕະລາງຍອດຂາຍ ດຶງມາຈາກ query ໂດຍກົງ (unit_sell_summary), ບໍ່ແມ່ນປ້ອນເອງ.
  // ຍອດໂອນ/ເຫຼືອ ຍັງເປັນຂໍ້ມູນປ້ອນມືເພາະລະບົບບໍ່ໄດ້ບັນທຶກໄວ້ — edits ຍັງຄົງຢູ່
  // ໃນແຕ່ລະ unit ເມື່ອ refetch (keyed by UNIT_ID).
  useEffect(() => {
    if (!periodDate) {
      setRows((config.seedRows ?? []).map((name) => ({ id: newId(), name, sale: 0, transferred: 0, remaining: 0 })));
      return;
    }

    let cancelled = false;
    (async () => {
      setSellLoading(true);
      setSellError(null);
      try {
        const qs = new URLSearchParams({ view: "unit_sell_summary", variant: config.unitSellVariant, date: periodDate });
        const res = await fetch(`/api/oracle?${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນຍອດຂາຍລົ້ມເຫຼວ");

        if (cancelled) return;
        setRows((prev) => {
          // preserve any manually-entered ຍອດໂອນ/ເຫຼືອ per UNIT_ID across refetches
          const prevByUnit = new Map(prev.map((r) => [r.id, r]));
          return ((json.rows ?? []) as Record<string, unknown>[]).map((r) => {
            const unitId = String(r.UNIT_ID ?? "");
            const name = String(r.UNIT_NAME ?? "").trim() || unitId;
            const sale = Number(r.TOTAL_SELL_TT ?? 0);
            const existing = prevByUnit.get(unitId);
            return {
              id: unitId,
              name,
              sale,
              transferred: existing?.transferred ?? 0,
              remaining: existing?.remaining ?? 0,
            };
          });
        });
      } catch (e: unknown) {
        if (!cancelled) setSellError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setSellLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDate, config.unitSellVariant]);

  const grandDue = useMemo(
    () => rows.reduce((s, r) => s + computeDue(r, rate, config.hasRemainingCol), 0),
    [rows, rate, config.hasRemainingCol],
  );
  const payoutTotal = useMemo(
    () => payoutRows.reduce((s, r) => s + r.totalAmount, 0),
    [payoutRows],
  );

  const handleExport = async () => {
    if (user) {
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: config.activityExport,
        detail: `${config.pageTitle} — ງວດ ${toDisplayDate(periodDate) || "-"} (${rows.length} ${config.entityLabel})`,
      });
    }
    const displayDate = toDisplayDate(periodDate);
    await exportUnitLedger({
      fileName: `${config.fileNamePrefix}_${periodDate || "all"}.xlsx`,
      sheetName: periodDate || "sheet1",
      titleLine1: config.titleLines[0],
      titleLine2: config.titleLines[1],
      titleLine3: `${config.titleLines[2]}${displayDate ? ` (ງວດທີ ${displayDate})` : ""}`,
      entityLabel: config.entityLabel,
      drawId: displayDate,
      hasRemainingCol: config.hasRemainingCol,
      rows: rows.map((r) => ({
        name: r.name,
        sale: r.sale,
        pct: r.sale * rate,
        remaining: r.remaining,
        transferred: r.transferred,
        due: computeDue(r, rate, config.hasRemainingCol),
      })),
      payoutRows: payoutRows.map((p) => ({
        user: p.user,
        totalCount: p.totalCount,
        totalAmount: p.totalAmount,
      })),
      printedBy: user?.displayName ?? "",
    });
  };

  const handlePrint = () => {
    if (user) {
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: config.activityPrint,
        detail: `${config.pageTitle} — ງວດ ${toDisplayDate(periodDate) || "-"}`,
      });
    }
    window.print();
  };

  return (
    <div className="w-full">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">{config.pageTitle}</h1>
            <p className="text-xs text-slate-500">{config.pageSubtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileDown size={14} /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer size={14} /> ພິມ
          </button>
        </div>
      </div>

      <div className="print-area">
        {sellError && (
          <div className="no-print mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={14} /> {sellError}
          </div>
        )}
        {sellLoading && (
          <div className="no-print mb-3 flex items-center gap-2 text-xs text-slate-400">
            <RefreshCw size={12} className="animate-spin" /> ກຳລັງດຶງຍອດຂາຍ...
          </div>
        )}

        <UnitLedgerEditor
          entityLabel={config.entityLabel}
          periodDate={periodDate}
          onPeriodDateChange={setPeriodDate}
          rate={rate}
          onRateChange={setRate}
          rows={rows}
          onRowsChange={setRows}
          hasRemainingCol={config.hasRemainingCol}
          autoRows
        />

        <PayoutByUserSection dateFrom={periodDate} dateTo={periodDate} onRowsChange={setPayoutRows} />

        {(rows.length > 0 || payoutRows.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">ຍອດຕ້ອງຖອກລວມ (ຕາຕະລາງເທິງ)</p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {grandDue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">ຍອດຈ່າຍລວມ (Payout ຕາມ User)</p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {payoutTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

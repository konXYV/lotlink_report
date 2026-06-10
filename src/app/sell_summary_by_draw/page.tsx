"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle,
  Printer,
  X,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";
import { exportSellSummaryByDraw } from "@/lib/ExportSellSummaryByDraw";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SummaryRow {
  DRAW_ID: number;
  DRAW_DATE: string;
  LOTLINK: number;
  BCEL: number;
  POINT: number;
  SCN_BCEL: number;
  SCN_LDB: number;
  SCN_MMONEY: number;
  JDB: number;
  LDB: number;
  DIFF: number;
}

type SortKey = keyof SummaryRow;
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n === 0
    ? "-"
    : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtDiff = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({
  col,
  sort,
}: {
  col: SortKey;
  sort: { key: SortKey; dir: SortDir };
}) {
  if (sort.key !== col) return <ChevronUp size={11} className="opacity-20" />;
  return sort.dir === "asc" ? (
    <ChevronUp size={11} className="text-blue-500" />
  ) : (
    <ChevronDown size={11} className="text-blue-500" />
  );
}

// ─── Tailwind shortcuts ───────────────────────────────────────────────────────
const TH =
  "px-2 py-1.5 text-center text-[11px] font-semibold cursor-pointer select-none whitespace-nowrap border border-gray-400 hover:bg-yellow-200 transition-colors";

// ຕົວເລກ: Arial Narrow
const TD_R =
  "px-2 py-1.5 text-right text-xs border border-gray-300 whitespace-nowrap";
const TD_C =
  "px-2 py-1.5 text-center text-xs border border-gray-300 whitespace-nowrap";

// inline style ສຳລັບ Arial Narrow
const ARIAL_NARROW: React.CSSProperties = {
  fontFamily: "'Arial Narrow', Arial, sans-serif",
};

// ─── Grand total helper ───────────────────────────────────────────────────────
function sumRows(rows: SummaryRow[]) {
  const z = {
    LOTLINK: 0,
    BCEL: 0,
    POINT: 0,
    SCN_BCEL: 0,
    SCN_LDB: 0,
    SCN_MMONEY: 0,
    JDB: 0,
    LDB: 0,
    DIFF: 0,
  };
  for (const r of rows) {
    z.LOTLINK += r.LOTLINK;
    z.BCEL += r.BCEL;
    z.POINT += r.POINT;
    z.SCN_BCEL += r.SCN_BCEL;
    z.SCN_LDB += r.SCN_LDB;
    z.SCN_MMONEY += r.SCN_MMONEY;
    z.JDB += r.JDB;
    z.LDB += r.LDB;
    z.DIFF += r.DIFF;
  }
  return z;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SellSummaryByDrawPage() {
  const { user, perm } = useAuth();

  const [drawIds, setDrawIds] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState(true);
  const [idsError, setIdsError] = useState<string | null>(null);

  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo, setDrawTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "DRAW_ID",
    dir: "desc",
  });
  const [hasSearched, setHasSearched] = useState(false);

  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  // ── Step 1: load available DRAW_IDs ───────────────────────────────────────
  const fetchDrawIds = async () => {
    setLoadingIds(true);
    setIdsError(null);
    try {
      const res = await fetch("/api/oracle?view=sell_summary_draw_ids");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງ DRAW_ID ລົ້ມເຫຼວ");
      setDrawIds(
        (json.rows ?? []).map((r: Record<string, unknown>) =>
          String(r.DRAW_ID ?? ""),
        ),
      );
    } catch (e) {
      setIdsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingIds(false);
    }
  };

  useEffect(() => {
    fetchDrawIds();
  }, []);

  // ── Step 2: load summary rows on demand ───────────────────────────────────
  const fetchRows = async (from: string, to: string) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "sell_summary_by_draw" });
      if (from) qs.set("draw_from", from);
      if (to) qs.set("draw_to", to);
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  };

  const handleApply = () => {
    setAppliedFrom(drawFrom);
    setAppliedTo(drawTo);
    setHasSearched(true);
    fetchRows(drawFrom, drawTo);
    if (user)
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: "lotto_search",
        detail: `sell_summary_by_draw: ${drawFrom || "ALL"}~${drawTo || "ALL"}`,
      });
  };

  const handleClear = () => {
    setDrawFrom("");
    setDrawTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setHasSearched(false);
    setRows([]);
  };

  // ── Sort ──────────────────────────────────────────────────────────────────
  const toggleSort = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const sorted = useMemo(() => {
    if (!hasSearched) return [];
    return [...rows].sort((a, b) => {
      const av = a[sort.key],
        bv = b[sort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, hasSearched]);

  const grand = useMemo(() => sumRows(sorted), [sorted]);

  const canPrint = perm ? perm("lotto_print") : false;
  const canExport = perm ? perm("lotto_export") : false;

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

  // ── Export Excel ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!sorted.length) return;
    setExporting(true);
    try {
      await exportSellSummaryByDraw(
        sorted,
        appliedFrom,
        appliedTo,
        user?.displayName ?? user?.email ?? "",
      );
      if (user)
        logActivity({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          action: "lotto_export",
          detail: `sell_summary_by_draw export: ${appliedFrom || "ALL"}~${appliedTo || "ALL"}`,
        });
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Print CSS ── */}
      <style>{`
        @font-face {
          font-family: 'Arial Narrow';
          src: local('Arial Narrow');
        }
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 8px; }
          table { font-size: 8pt; border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333 !important; padding: 2px 4px !important; }
          .num-cell { font-family: 'Arial Narrow', Arial, sans-serif !important; }
          .print-signature { display: flex !important; justify-content: space-around; margin-top: 48px; }
          .sig-box { text-align: center; width: 160px; }
          .sig-line { margin-top: 48px; border-top: 1px solid #333; padding-top: 4px; font-size: 8pt; }
        }
      `}</style>

      <div id="print-area" className="p-4 max-w-[1600px] mx-auto space-y-4">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              ລາຍງານຍອດຂາຍຈາກລະບົບ Lotlink, ລະບົບ Splus ແລະ ລະບົບ SCN
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ສັງລວມຕາມງວດ — Lotlink (080821001APP) · Splus BCEL/POINT · SCN ·
              JDB/LDB
            </p>
          </div>
          <div className="flex gap-2">
            {canExport && hasSearched && sorted.length > 0 && (
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {exporting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={14} />
                )}
                Export Excel
              </button>
            )}
            {canPrint && hasSearched && sorted.length > 0 && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded text-xs hover:bg-slate-800 transition-colors"
              >
                <Printer size={14} /> ພິມ
              </button>
            )}
          </div>
        </div>

        {/* ── Print title (hidden on screen) ── */}
        <div className="hidden print-title">
          ລາຍງານຍອດຂາຍຈາກລະບົບ Lotlink, ລະບົບ Splus ແລະ ລະບົບ SCN
          {appliedFrom || appliedTo
            ? ` (ງວດ ${appliedFrom || "…"} - ${appliedTo || "…"})`
            : ""}
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm no-print">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                <Filter size={12} /> ງວດເລີ່ມຕົ້ນ
              </label>
              {loadingIds ? (
                <div className="w-36 h-8 bg-slate-100 animate-pulse rounded" />
              ) : (
                <select
                  value={drawFrom}
                  onChange={(e) => setDrawFrom(e.target.value)}
                  className="w-36 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  style={ARIAL_NARROW}
                >
                  <option value="">-- ທັງໝົດ --</option>
                  {[...drawIds]
                    .sort((a, b) => Number(b) - Number(a))
                    .map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                ງວດສິ້ນສຸດ
              </label>
              {loadingIds ? (
                <div className="w-36 h-8 bg-slate-100 animate-pulse rounded" />
              ) : (
                <select
                  value={drawTo}
                  onChange={(e) => setDrawTo(e.target.value)}
                  className="w-36 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  style={ARIAL_NARROW}
                >
                  <option value="">-- ທັງໝົດ --</option>
                  {[...drawIds]
                    .sort((a, b) => Number(b) - Number(a))
                    .map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pb-0.5">
              <button
                onClick={handleApply}
                disabled={loadingRows}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loadingRows ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                ສະແດງຂໍ້ມູນ
              </button>
              {hasSearched && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-100 transition-colors"
                >
                  <X size={14} /> ລ້າງ
                </button>
              )}
            </div>
          </div>

          {idsError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertCircle size={14} /> {idsError}
            </div>
          )}
        </div>

        {/* ── Table card ── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Summary badges */}
          {hasSearched && !loadingRows && sorted.length > 0 && (
            <div className="flex flex-wrap gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 no-print">
              <span className="text-xs font-semibold text-slate-600">
                ທັງໝົດ{" "}
                <span className="text-blue-700" style={ARIAL_NARROW}>
                  {sorted.length.toLocaleString()}
                </span>{" "}
                ງວດ
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Lotlink:{" "}
                <span className="text-violet-700" style={ARIAL_NARROW}>
                  {fmt(grand.LOTLINK)}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                BCEL:{" "}
                <span className="text-teal-700" style={ARIAL_NARROW}>
                  {fmt(grand.BCEL)}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                SCN BCEL:{" "}
                <span className="text-teal-700" style={ARIAL_NARROW}>
                  {fmt(grand.SCN_BCEL)}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                JDB+LDB:{" "}
                <span className="text-orange-700" style={ARIAL_NARROW}>
                  {fmt(grand.JDB + grand.LDB)}
                </span>
              </span>
              <span
                className={`text-xs font-semibold ${grand.DIFF < 0 ? "text-red-600" : grand.DIFF === 0 ? "text-emerald-600" : "text-amber-600"}`}
                style={ARIAL_NARROW}
              >
                ສ່ວນຕ່າງ: {fmtDiff(grand.DIFF)}
              </span>
            </div>
          )}

          {/* Loading */}
          {loadingRows && (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກຳລັງໂຫຼດຂໍ້ມູນ...</span>
            </div>
          )}

          {/* Error */}
          {rowsError && !loadingRows && (
            <div className="m-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
              <AlertCircle size={16} />
              <span>{rowsError}</span>
            </div>
          )}

          {/* Empty state */}
          {!loadingRows && !rowsError && hasSearched && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileSpreadsheet size={32} className="mb-2 opacity-40" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງງວດທີ່ເລືອກ</p>
            </div>
          )}

          {/* Initial state */}
          {!hasSearched && !loadingRows && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Filter size={32} className="mb-2 opacity-40" />
              <p className="text-sm">ເລືອກງວດ ແລ້ວກົດ "ສະແດງຂໍ້ມູນ"</p>
            </div>
          )}

          {/* Data table */}
          {!loadingRows && !rowsError && sorted.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {/* ── Row 1: group headers ── */}
                  <tr className="bg-yellow-200">
                    <th className={`${TH} border-b-0`} rowSpan={2}>
                      ງວດ
                    </th>
                    <th className={`${TH} border-b-0`} rowSpan={2}>
                      ວັນທີ
                    </th>
                    <th className={`${TH} border-b-0 bg-cyan-100`} rowSpan={2}>
                      <div>Lotlink</div>
                      <div className="font-normal text-[10px] text-slate-500 mt-0.5">
                        080821001APP
                      </div>
                    </th>
                    <th
                      className={`${TH} bg-blue-100 text-blue-800`}
                      colSpan={2}
                    >
                      SOKXAY-BCEL
                    </th>
                    <th
                      className={`${TH} bg-green-100 text-green-800`}
                      colSpan={3}
                    >
                      SCN-SOKXAY
                    </th>
                    <th
                      className={`${TH} bg-orange-100 text-orange-800`}
                      colSpan={2}
                    >
                      SOKXAY-LDB/JDB
                    </th>
                    <th
                      className={`${TH} border-b-0 bg-red-100 text-red-800`}
                      rowSpan={2}
                    >
                      Diff
                    </th>
                  </tr>
                  {/* ── Row 2: sub-column headers ── */}
                  <tr className="bg-yellow-100">
                    <th
                      className={`${TH} bg-blue-50`}
                      onClick={() => toggleSort("BCEL")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        BCEL <SortIcon col="BCEL" sort={sort} />
                      </span>
                    </th>
                    <th
                      className={`${TH} bg-blue-50`}
                      onClick={() => toggleSort("POINT")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        POINT <SortIcon col="POINT" sort={sort} />
                      </span>
                    </th>
                    <th
                      className={`${TH} bg-green-50`}
                      onClick={() => toggleSort("SCN_BCEL")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        BCEL <SortIcon col="SCN_BCEL" sort={sort} />
                      </span>
                    </th>
                    <th
                      className={`${TH} bg-green-50`}
                      onClick={() => toggleSort("SCN_LDB")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        LDB <SortIcon col="SCN_LDB" sort={sort} />
                      </span>
                    </th>
                    <th
                      className={`${TH} bg-green-50`}
                      onClick={() => toggleSort("SCN_MMONEY")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        Mmoney <SortIcon col="SCN_MMONEY" sort={sort} />
                      </span>
                    </th>
                    <th
                      className={`${TH} bg-orange-50`}
                      onClick={() => toggleSort("JDB")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        JDB <SortIcon col="JDB" sort={sort} />
                      </span>
                    </th>
                    <th
                      className={`${TH} bg-orange-50`}
                      onClick={() => toggleSort("LDB")}
                    >
                      <span className="flex items-center justify-center gap-1">
                        LDB <SortIcon col="LDB" sort={sort} />
                      </span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.DRAW_ID} className="hover:bg-slate-50">
                      {/* ງວດ */}
                      <td
                        className={`${TD_C} text-violet-700 font-semibold num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {r.DRAW_ID}
                      </td>
                      {/* ວັນທີ */}
                      <td className={`${TD_C} num-cell`} style={ARIAL_NARROW}>
                        {r.DRAW_DATE}
                      </td>
                      {/* Lotlink */}
                      <td
                        className={`${TD_R} text-cyan-700 font-semibold bg-cyan-50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.LOTLINK)}
                      </td>
                      {/* SOKXAY-BCEL */}
                      <td
                        className={`${TD_R} bg-blue-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.BCEL)}
                      </td>
                      <td
                        className={`${TD_R} bg-blue-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.POINT)}
                      </td>
                      {/* SCN */}
                      <td
                        className={`${TD_R} bg-green-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.SCN_BCEL)}
                      </td>
                      <td
                        className={`${TD_R} bg-green-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.SCN_LDB)}
                      </td>
                      <td
                        className={`${TD_R} bg-green-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.SCN_MMONEY)}
                      </td>
                      {/* JDB/LDB */}
                      <td
                        className={`${TD_R} bg-orange-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.JDB)}
                      </td>
                      <td
                        className={`${TD_R} bg-orange-50/50 num-cell`}
                        style={ARIAL_NARROW}
                      >
                        {fmt(r.LDB)}
                      </td>
                      {/* Diff */}
                      <td
                        className={`${TD_R} font-semibold num-cell ${
                          r.DIFF < 0
                            ? "text-red-600 bg-red-50"
                            : r.DIFF === 0
                              ? "text-emerald-600 bg-emerald-50"
                              : "text-amber-600 bg-amber-50"
                        }`}
                        style={ARIAL_NARROW}
                      >
                        {fmtDiff(r.DIFF)}
                      </td>
                    </tr>
                  ))}

                  {/* ── Grand total row ── */}
                  <tr className="bg-gray-300 font-bold text-sm">
                    <td className={`${TD_C} font-bold`} colSpan={2}>
                      ລວມທັງໝົດ
                    </td>
                    <td
                      className={`${TD_R} text-cyan-800 num-cell`}
                      style={ARIAL_NARROW}
                    >
                      {fmt(grand.LOTLINK)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.BCEL)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.POINT)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.SCN_BCEL)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.SCN_LDB)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.SCN_MMONEY)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.JDB)}
                    </td>
                    <td className={`${TD_R} num-cell`} style={ARIAL_NARROW}>
                      {fmt(grand.LDB)}
                    </td>
                    <td
                      className={`${TD_R} font-bold num-cell ${
                        grand.DIFF < 0
                          ? "text-red-700"
                          : grand.DIFF === 0
                            ? "text-emerald-700"
                            : "text-amber-700"
                      }`}
                      style={ARIAL_NARROW}
                    >
                      {fmtDiff(grand.DIFF)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Print signature section ── */}
        {hasSearched && sorted.length > 0 && (
          <div className="hidden print-signature">
            <div className="sig-box">
              <div className="sig-line">
                ອຳນວຍການ ບໍລິສັດ
                <br />
                Sokxay One Plus E-commerce
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">
                ຜູ້ຈັດການບັນຊີ
                <br />
                ບໍລິສັດ ຫວຍ
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">
                IT ບໍລິສັດ
                <br />
                Sokxay One Plus E-commerce
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສັງລວມ</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

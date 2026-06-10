"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle,
  Filter,
  Smartphone,
  Monitor,
  X,
  BarChart2,
  CalendarDays,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DrawRow {
  DRAWID: string;
  DRAW_DATE: string;
  TOTAL_BILLS_ALL: number;
  TOTAL_SALE_ALL: number;
  // APP sub-channels
  BILLS_APP_SOKXAY: number;
  SALE_APP_SOKXAY: number;
  BILLS_APP_SCN: number;
  SALE_APP_SCN: number;
  TOTAL_BILLS_APP: number;
  TOTAL_SALE_APP: number;
  DIFF_BILLS_APP: number;
  DIFF_SALE_APP: number;
  // POS sub-channels
  TOTAL_BILLS_POS: number;
  TOTAL_SALE_POS: number;
  BILLS_POS_TOUBEE: number;
  SALE_POS_TOUBEE: number;
  BILLS_POS_SCN: number;
  SALE_POS_SCN: number;
  DIFF_BILLS_POS: number;
  DIFF_SALE_POS: number;
  // Grand diff
  DIFF_BILLS_ALL: number;
  DIFF_SALE_ALL: number;
}

interface MonthRow {
  SALE_MONTH: string;
  TOTAL_BILLS_ALL: number;
  TOTAL_SALE_ALL: number;
  // APP sub-channels
  BILLS_APP_SOKXAY: number;
  SALE_APP_SOKXAY: number;
  BILLS_APP_SCN: number;
  SALE_APP_SCN: number;
  TOTAL_BILLS_APP: number;
  TOTAL_SALE_APP: number;
  DIFF_BILLS_APP: number;
  DIFF_SALE_APP: number;
  // POS sub-channels
  TOTAL_BILLS_POS: number;
  TOTAL_SALE_POS: number;
  BILLS_POS_TOUBEE: number;
  SALE_POS_TOUBEE: number;
  BILLS_POS_SCN: number;
  SALE_POS_SCN: number;
  DIFF_BILLS_POS: number;
  DIFF_SALE_POS: number;
  // Grand diff
  DIFF_BILLS_ALL: number;
  DIFF_SALE_ALL: number;
}

type Tab = "draw" | "month";
type DrawSortKey = keyof DrawRow;
type MonthSortKey = keyof MonthRow;
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ARIAL_NARROW: React.CSSProperties = {
  fontFamily: "'Arial Narrow', Arial, sans-serif",
};

const fmt = (n: number) =>
  n === 0
    ? "-"
    : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtInt = (n: number) => (n === 0 ? "-" : n.toLocaleString("en-US"));

const fmtDiff = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Style shortcuts ──────────────────────────────────────────────────────────
const TH =
  "px-2 py-1.5 text-center text-[11px] font-semibold cursor-pointer select-none whitespace-nowrap border border-gray-400 hover:bg-yellow-200 transition-colors";
const TH_NOCLICK =
  "px-2 py-1.5 text-center text-[11px] font-semibold whitespace-nowrap border border-gray-400";
const TD_R =
  "px-2 py-1.5 text-right text-xs border border-gray-300 whitespace-nowrap";
const TD_C =
  "px-2 py-1.5 text-center text-xs border border-gray-300 whitespace-nowrap";

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon<K extends string>({
  col,
  sort,
}: {
  col: K;
  sort: { key: K; dir: SortDir };
}) {
  if (sort.key !== col) return <ChevronUp size={11} className="opacity-20" />;
  return sort.dir === "asc" ? (
    <ChevronUp size={11} className="text-blue-500" />
  ) : (
    <ChevronDown size={11} className="text-blue-500" />
  );
}

// ─── Grand total helpers ──────────────────────────────────────────────────────
function sumDrawRows(rows: DrawRow[]) {
  return rows.reduce(
    (acc, r) => ({
      TOTAL_BILLS_ALL: acc.TOTAL_BILLS_ALL + r.TOTAL_BILLS_ALL,
      TOTAL_SALE_ALL: acc.TOTAL_SALE_ALL + r.TOTAL_SALE_ALL,
      BILLS_APP_SOKXAY: acc.BILLS_APP_SOKXAY + r.BILLS_APP_SOKXAY,
      SALE_APP_SOKXAY: acc.SALE_APP_SOKXAY + r.SALE_APP_SOKXAY,
      BILLS_APP_SCN: acc.BILLS_APP_SCN + r.BILLS_APP_SCN,
      SALE_APP_SCN: acc.SALE_APP_SCN + r.SALE_APP_SCN,
      TOTAL_BILLS_APP: acc.TOTAL_BILLS_APP + r.TOTAL_BILLS_APP,
      TOTAL_SALE_APP: acc.TOTAL_SALE_APP + r.TOTAL_SALE_APP,
      DIFF_BILLS_APP: acc.DIFF_BILLS_APP + r.DIFF_BILLS_APP,
      DIFF_SALE_APP: acc.DIFF_SALE_APP + r.DIFF_SALE_APP,
      TOTAL_BILLS_POS: acc.TOTAL_BILLS_POS + r.TOTAL_BILLS_POS,
      TOTAL_SALE_POS: acc.TOTAL_SALE_POS + r.TOTAL_SALE_POS,
      BILLS_POS_TOUBEE: acc.BILLS_POS_TOUBEE + r.BILLS_POS_TOUBEE,
      SALE_POS_TOUBEE: acc.SALE_POS_TOUBEE + r.SALE_POS_TOUBEE,
      BILLS_POS_SCN: acc.BILLS_POS_SCN + r.BILLS_POS_SCN,
      SALE_POS_SCN: acc.SALE_POS_SCN + r.SALE_POS_SCN,
      DIFF_BILLS_POS: acc.DIFF_BILLS_POS + r.DIFF_BILLS_POS,
      DIFF_SALE_POS: acc.DIFF_SALE_POS + r.DIFF_SALE_POS,
      DIFF_BILLS_ALL: acc.DIFF_BILLS_ALL + r.DIFF_BILLS_ALL,
      DIFF_SALE_ALL: acc.DIFF_SALE_ALL + r.DIFF_SALE_ALL,
    }),
    {
      TOTAL_BILLS_ALL: 0,
      TOTAL_SALE_ALL: 0,
      BILLS_APP_SOKXAY: 0,
      SALE_APP_SOKXAY: 0,
      BILLS_APP_SCN: 0,
      SALE_APP_SCN: 0,
      TOTAL_BILLS_APP: 0,
      TOTAL_SALE_APP: 0,
      DIFF_BILLS_APP: 0,
      DIFF_SALE_APP: 0,
      TOTAL_BILLS_POS: 0,
      TOTAL_SALE_POS: 0,
      BILLS_POS_TOUBEE: 0,
      SALE_POS_TOUBEE: 0,
      BILLS_POS_SCN: 0,
      SALE_POS_SCN: 0,
      DIFF_BILLS_POS: 0,
      DIFF_SALE_POS: 0,
      DIFF_BILLS_ALL: 0,
      DIFF_SALE_ALL: 0,
    },
  );
}

function sumMonthRows(rows: MonthRow[]) {
  return rows.reduce(
    (acc, r) => ({
      TOTAL_BILLS_ALL: acc.TOTAL_BILLS_ALL + r.TOTAL_BILLS_ALL,
      TOTAL_SALE_ALL: acc.TOTAL_SALE_ALL + r.TOTAL_SALE_ALL,
      BILLS_APP_SOKXAY: acc.BILLS_APP_SOKXAY + r.BILLS_APP_SOKXAY,
      SALE_APP_SOKXAY: acc.SALE_APP_SOKXAY + r.SALE_APP_SOKXAY,
      BILLS_APP_SCN: acc.BILLS_APP_SCN + r.BILLS_APP_SCN,
      SALE_APP_SCN: acc.SALE_APP_SCN + r.SALE_APP_SCN,
      TOTAL_BILLS_APP: acc.TOTAL_BILLS_APP + r.TOTAL_BILLS_APP,
      TOTAL_SALE_APP: acc.TOTAL_SALE_APP + r.TOTAL_SALE_APP,
      DIFF_BILLS_APP: acc.DIFF_BILLS_APP + r.DIFF_BILLS_APP,
      DIFF_SALE_APP: acc.DIFF_SALE_APP + r.DIFF_SALE_APP,
      TOTAL_BILLS_POS: acc.TOTAL_BILLS_POS + r.TOTAL_BILLS_POS,
      TOTAL_SALE_POS: acc.TOTAL_SALE_POS + r.TOTAL_SALE_POS,
      BILLS_POS_TOUBEE: acc.BILLS_POS_TOUBEE + r.BILLS_POS_TOUBEE,
      SALE_POS_TOUBEE: acc.SALE_POS_TOUBEE + r.SALE_POS_TOUBEE,
      BILLS_POS_SCN: acc.BILLS_POS_SCN + r.BILLS_POS_SCN,
      SALE_POS_SCN: acc.SALE_POS_SCN + r.SALE_POS_SCN,
      DIFF_BILLS_POS: acc.DIFF_BILLS_POS + r.DIFF_BILLS_POS,
      DIFF_SALE_POS: acc.DIFF_SALE_POS + r.DIFF_SALE_POS,
      DIFF_BILLS_ALL: acc.DIFF_BILLS_ALL + r.DIFF_BILLS_ALL,
      DIFF_SALE_ALL: acc.DIFF_SALE_ALL + r.DIFF_SALE_ALL,
    }),
    {
      TOTAL_BILLS_ALL: 0,
      TOTAL_SALE_ALL: 0,
      BILLS_APP_SOKXAY: 0,
      SALE_APP_SOKXAY: 0,
      BILLS_APP_SCN: 0,
      SALE_APP_SCN: 0,
      TOTAL_BILLS_APP: 0,
      TOTAL_SALE_APP: 0,
      DIFF_BILLS_APP: 0,
      DIFF_SALE_APP: 0,
      TOTAL_BILLS_POS: 0,
      TOTAL_SALE_POS: 0,
      BILLS_POS_TOUBEE: 0,
      SALE_POS_TOUBEE: 0,
      BILLS_POS_SCN: 0,
      SALE_POS_SCN: 0,
      DIFF_BILLS_POS: 0,
      DIFF_SALE_POS: 0,
      DIFF_BILLS_ALL: 0,
      DIFF_SALE_ALL: 0,
    },
  );
}

// ─── Diff cell class ──────────────────────────────────────────────────────────
const diffCls = (n: number) =>
  n < 0
    ? "text-red-600 bg-red-50"
    : n === 0
      ? "text-emerald-600 bg-emerald-50"
      : "text-amber-600 bg-amber-50";

// ═══════════════════════════════════════════════════════════════════════════════
export default function SellChannelSummaryPage() {
  const { user, perm } = useAuth();
  const canExport = perm ? perm("lotto_export") : false;

  // ── Tab ────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("draw");

  // ── DRAW-IDs dropdown ─────────────────────────────────────────────────────
  const [drawIds, setDrawIds] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState(true);
  const [idsError, setIdsError] = useState<string | null>(null);

  // ── Draw tab state ─────────────────────────────────────────────────────────
  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo, setDrawTo] = useState("");
  const [drawRows, setDrawRows] = useState<DrawRow[]>([]);
  const [loadingDraw, setLoadingDraw] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawSearched, setDrawSearched] = useState(false);
  const [drawSort, setDrawSort] = useState<{ key: DrawSortKey; dir: SortDir }>({
    key: "DRAWID",
    dir: "asc",
  });

  // ── Month tab state ────────────────────────────────────────────────────────
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [monthSearched, setMonthSearched] = useState(false);
  const [monthSort, setMonthSort] = useState<{
    key: MonthSortKey;
    dir: SortDir;
  }>({ key: "SALE_MONTH", dir: "asc" });

  // ── Load draw IDs ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingIds(true);
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
    })();
  }, []);

  // ── Fetch draw-level data ──────────────────────────────────────────────────
  const fetchDraw = async (from: string, to: string) => {
    setLoadingDraw(true);
    setDrawError(null);
    try {
      const qs = new URLSearchParams({ view: "sell_channel_by_draw" });
      if (from) qs.set("draw_from", from);
      if (to) qs.set("draw_to", to);
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setDrawRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      setDrawError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDraw(false);
    }
  };

  // ── Fetch month-level data ─────────────────────────────────────────────────
  const fetchMonth = async (from: string, to: string) => {
    setLoadingMonth(true);
    setMonthError(null);
    try {
      const qs = new URLSearchParams({ view: "sell_channel_by_month" });
      if (from) qs.set("month_from", from);
      if (to) qs.set("month_to", to);
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setMonthRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e) {
      setMonthError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMonth(false);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleApplyDraw = () => {
    setDrawSearched(true);
    fetchDraw(drawFrom, drawTo);
    if (user)
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: "lotto_search",
        detail: `sell_channel_by_draw: ${drawFrom || "ALL"}~${drawTo || "ALL"}`,
      });
  };

  const handleClearDraw = () => {
    setDrawFrom("");
    setDrawTo("");
    setDrawSearched(false);
    setDrawRows([]);
  };

  const handleApplyMonth = () => {
    setMonthSearched(true);
    fetchMonth(monthFrom, monthTo);
    if (user)
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: "lotto_search",
        detail: `sell_channel_by_month: ${monthFrom || "ALL"}~${monthTo || "ALL"}`,
      });
  };

  const handleClearMonth = () => {
    setMonthFrom("");
    setMonthTo("");
    setMonthSearched(false);
    setMonthRows([]);
  };

  // ── Sort helpers ───────────────────────────────────────────────────────────
  const toggleDrawSort = (key: DrawSortKey) =>
    setDrawSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const toggleMonthSort = (key: MonthSortKey) =>
    setMonthSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const sortedDraw = useMemo(() => {
    if (!drawSearched) return [];
    return [...drawRows].sort((a, b) => {
      const av = a[drawSort.key],
        bv = b[drawSort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
              numeric: true,
            });
      return drawSort.dir === "asc" ? cmp : -cmp;
    });
  }, [drawRows, drawSort, drawSearched]);

  const sortedMonth = useMemo(() => {
    if (!monthSearched) return [];
    return [...monthRows].sort((a, b) => {
      const av = a[monthSort.key],
        bv = b[monthSort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""));
      return monthSort.dir === "asc" ? cmp : -cmp;
    });
  }, [monthRows, monthSort, monthSearched]);

  const grandDraw = useMemo(() => sumDrawRows(sortedDraw), [sortedDraw]);
  const grandMonth = useMemo(() => sumMonthRows(sortedMonth), [sortedMonth]);

  // ── Derive unique month list from drawIds for month picker ─────────────────
  // We use a simple year-month input (text field) since we don't have a month list endpoint
  const sortedDrawIds = useMemo(
    () => [...drawIds].sort((a, b) => Number(b) - Number(a)),
    [drawIds],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @font-face { font-family: 'Arial Narrow'; src: local('Arial Narrow'); }
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-title { font-size: 13pt; font-weight: bold; text-align: center; margin-bottom: 8px; }
          table { font-size: 8pt; border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333 !important; padding: 2px 4px !important; }
        }
      `}</style>

      <div id="print-area" className="p-4 max-w-[1400px] mx-auto space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              ລາຍງານຍອດຂາຍຕາມ Channel (APP vs POS)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ສັງລວມຈາກ LOTLINK_BILL — APP-Sokxay · APP-SCN · POS
            </p>
          </div>
          {canExport && (
            <div className="flex gap-2 items-center">
              <span className="text-xs text-slate-400">
                <FileSpreadsheet size={14} className="inline mr-1" />
                ສົ່ງອອກ Excel (ໄວໃນ໌)
              </span>
            </div>
          )}
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex gap-1 no-print">
          <button
            onClick={() => setTab("draw")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors
              ${
                tab === "draw"
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
          >
            <BarChart2 size={15} />
            ສັງລວມຕາມງວດ
          </button>
          <button
            onClick={() => setTab("month")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors
              ${
                tab === "month"
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
          >
            <CalendarDays size={15} />
            ສັງລວມຕາມເດືອນ
          </button>
        </div>

        {/* ══════════════════════ TAB: BY DRAW ═══════════════════════════════ */}
        {tab === "draw" && (
          <div className="space-y-4">
            {/* Filter */}
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
                      className="w-36 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      style={ARIAL_NARROW}
                    >
                      <option value="">-- ທັງໝົດ --</option>
                      {sortedDrawIds.map((id) => (
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
                      className="w-36 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                      style={ARIAL_NARROW}
                    >
                      <option value="">-- ທັງໝົດ --</option>
                      {sortedDrawIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-2 pb-0.5">
                  <button
                    onClick={handleApplyDraw}
                    disabled={loadingDraw}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingDraw ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    ສະແດງຂໍ້ມູນ
                  </button>
                  {drawSearched && (
                    <button
                      onClick={handleClearDraw}
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

            {/* Table card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {/* Summary badges */}
              {drawSearched && !loadingDraw && sortedDraw.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200 no-print text-xs">
                  <span className="font-semibold text-slate-600">
                    ທັງໝົດ{" "}
                    <span className="text-blue-700" style={ARIAL_NARROW}>
                      {sortedDraw.length.toLocaleString()}
                    </span>{" "}
                    ງວດ
                  </span>
                  <span className="font-semibold text-slate-600">
                    ຍອດລວມ:{" "}
                    <span className="text-slate-800" style={ARIAL_NARROW}>
                      {fmt(grandDraw.TOTAL_SALE_ALL)}
                    </span>
                  </span>
                  <span className="font-semibold text-indigo-700">
                    <Smartphone
                      size={12}
                      className="inline mr-1 text-indigo-400"
                    />
                    APP-Sokxay:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmt(grandDraw.SALE_APP_SOKXAY)}
                    </span>
                  </span>
                  <span className="font-semibold text-cyan-700">
                    <Smartphone
                      size={12}
                      className="inline mr-1 text-cyan-400"
                    />
                    APP-SCN:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmt(grandDraw.SALE_APP_SCN)}
                    </span>
                  </span>
                  <span className="font-semibold text-orange-700">
                    <Monitor
                      size={12}
                      className="inline mr-1 text-orange-400"
                    />
                    POS:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmt(grandDraw.TOTAL_SALE_POS)}
                    </span>
                  </span>
                  <span
                    className={`font-semibold ${
                      grandDraw.DIFF_SALE_ALL < 0
                        ? "text-red-600"
                        : grandDraw.DIFF_SALE_ALL === 0
                          ? "text-emerald-600"
                          : "text-amber-600"
                    }`}
                  >
                    Diff:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmtDiff(grandDraw.DIFF_SALE_ALL)}
                    </span>
                  </span>
                </div>
              )}

              {/* Loading */}
              {loadingDraw && (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
                  <RefreshCw size={20} className="animate-spin" />
                  <span className="text-sm">ກຳລັງໂຫຼດຂໍ້ມູນ...</span>
                </div>
              )}
              {/* Error */}
              {drawError && !loadingDraw && (
                <div className="m-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
                  <AlertCircle size={16} /> {drawError}
                </div>
              )}
              {/* Empty */}
              {!loadingDraw &&
                !drawError &&
                drawSearched &&
                sortedDraw.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <FileSpreadsheet size={32} className="mb-2 opacity-40" />
                    <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງງວດທີ່ເລືອກ</p>
                  </div>
                )}
              {/* Initial */}
              {!drawSearched && !loadingDraw && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Filter size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">
                    ເລືອກງວດ ແລ້ວກົດ &quot;ສະແດງຂໍ້ມູນ&quot;
                  </p>
                </div>
              )}

              {/* Data table */}
              {!loadingDraw && !drawError && sortedDraw.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      {/* Row 1: group headers */}
                      <tr className="bg-yellow-200">
                        <th className={`${TH_NOCLICK} border-b-0`} rowSpan={2}>
                          ງວດ
                        </th>
                        <th className={`${TH_NOCLICK} border-b-0`} rowSpan={2}>
                          ວັນທີ
                        </th>
                        {/* APP group: Sokxay(2) + SCN(2) + ລວມAPP(2) + DiffAPP(2) = 8 cols */}
                        <th
                          className={`${TH_NOCLICK} bg-indigo-100 text-indigo-800`}
                          colSpan={8}
                        >
                          <Smartphone size={12} className="inline mr-1" />
                          ຂາຍຜ່ານ APP (ທາງດ້ານ online)
                        </th>
                        {/* POS group: TouBee(2) + SCN(2) + ລວມPOS(2) + DiffPOS(2) = 8 cols */}
                        <th
                          className={`${TH_NOCLICK} bg-orange-100 text-orange-800`}
                          colSpan={8}
                        >
                          <Monitor size={12} className="inline mr-1" />
                          ຂາຍຜ່ານ POS
                        </th>
                        {/* Grand total + grand diff */}
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-slate-100`}
                          rowSpan={2}
                        >
                          ບິນທັງໝົດ
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-slate-100`}
                          rowSpan={2}
                        >
                          ຍອດລວມ
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-red-100 text-red-800`}
                          rowSpan={2}
                        >
                          Diff ບິນ
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-red-100 text-red-800`}
                          rowSpan={2}
                        >
                          Diff ຍອດ
                        </th>
                      </tr>
                      {/* Row 2: sub-headers */}
                      <tr className="bg-yellow-100">
                        {/* APP-Sokxay */}
                        <th
                          className={`${TH} bg-indigo-50 text-indigo-700`}
                          onClick={() => toggleDrawSort("BILLS_APP_SOKXAY")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            Sokxay ບິນ
                            <SortIcon col="BILLS_APP_SOKXAY" sort={drawSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-indigo-50 text-indigo-700`}
                          onClick={() => toggleDrawSort("SALE_APP_SOKXAY")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            Sokxay ຍອດ
                            <SortIcon col="SALE_APP_SOKXAY" sort={drawSort} />
                          </span>
                        </th>
                        {/* APP-SCN */}
                        <th
                          className={`${TH} bg-cyan-50 text-cyan-700`}
                          onClick={() => toggleDrawSort("BILLS_APP_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ບິນ
                            <SortIcon col="BILLS_APP_SCN" sort={drawSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-cyan-50 text-cyan-700`}
                          onClick={() => toggleDrawSort("SALE_APP_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ຍອດ
                            <SortIcon col="SALE_APP_SCN" sort={drawSort} />
                          </span>
                        </th>
                        {/* APP total */}
                        <th className={`${TH_NOCLICK} bg-indigo-100 font-bold`}>
                          ລວມ APP ບິນ
                        </th>
                        <th className={`${TH_NOCLICK} bg-indigo-100 font-bold`}>
                          ລວມ APP ຍອດ
                        </th>
                        {/* APP Diff */}
                        <th
                          className={`${TH_NOCLICK} bg-indigo-200 text-indigo-800 font-bold`}
                        >
                          Diff APP ບິນ
                        </th>
                        <th
                          className={`${TH_NOCLICK} bg-indigo-200 text-indigo-800 font-bold`}
                        >
                          Diff APP ຍອດ
                        </th>
                        {/* POS-TouBee */}
                        <th
                          className={`${TH} bg-orange-50 text-orange-700`}
                          onClick={() => toggleDrawSort("BILLS_POS_TOUBEE")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            TouBee ບິນ
                            <SortIcon col="BILLS_POS_TOUBEE" sort={drawSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-orange-50 text-orange-700`}
                          onClick={() => toggleDrawSort("SALE_POS_TOUBEE")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            TouBee ຍອດ
                            <SortIcon col="SALE_POS_TOUBEE" sort={drawSort} />
                          </span>
                        </th>
                        {/* POS-SCN */}
                        <th
                          className={`${TH} bg-amber-50 text-amber-700`}
                          onClick={() => toggleDrawSort("BILLS_POS_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ບິນ
                            <SortIcon col="BILLS_POS_SCN" sort={drawSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-amber-50 text-amber-700`}
                          onClick={() => toggleDrawSort("SALE_POS_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ຍອດ
                            <SortIcon col="SALE_POS_SCN" sort={drawSort} />
                          </span>
                        </th>
                        {/* POS total */}
                        <th className={`${TH_NOCLICK} bg-orange-100 font-bold`}>
                          ລວມ POS ບິນ
                        </th>
                        <th className={`${TH_NOCLICK} bg-orange-100 font-bold`}>
                          ລວມ POS ຍອດ
                        </th>
                        {/* POS Diff */}
                        <th
                          className={`${TH_NOCLICK} bg-orange-200 text-orange-800 font-bold`}
                        >
                          Diff POS ບິນ
                        </th>
                        <th
                          className={`${TH_NOCLICK} bg-orange-200 text-orange-800 font-bold`}
                        >
                          Diff POS ຍອດ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDraw.map((r) => {
                        return (
                          <tr key={r.DRAWID} className="hover:bg-slate-50">
                            <td
                              className={`${TD_C} text-violet-700 font-semibold`}
                              style={ARIAL_NARROW}
                            >
                              {r.DRAWID}
                            </td>
                            <td className={TD_C} style={ARIAL_NARROW}>
                              {r.DRAW_DATE}
                            </td>
                            {/* APP-Sokxay */}
                            <td
                              className={`${TD_R} bg-indigo-50/40`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.BILLS_APP_SOKXAY)}
                            </td>
                            <td
                              className={`${TD_R} bg-indigo-50/40 text-indigo-700`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.SALE_APP_SOKXAY)}
                            </td>
                            {/* APP-SCN */}
                            <td
                              className={`${TD_R} bg-cyan-50/40`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.BILLS_APP_SCN)}
                            </td>
                            <td
                              className={`${TD_R} bg-cyan-50/40 text-cyan-700`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.SALE_APP_SCN)}
                            </td>
                            {/* APP total */}
                            <td
                              className={`${TD_R} bg-indigo-100/50 font-semibold`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.TOTAL_BILLS_APP)}
                            </td>
                            <td
                              className={`${TD_R} bg-indigo-100/50 font-semibold text-indigo-800`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.TOTAL_SALE_APP)}
                            </td>
                            {/* APP Diff */}
                            <td
                              className={`${TD_R} bg-indigo-200/50 font-semibold ${diffCls(r.DIFF_BILLS_APP)}`}
                              style={ARIAL_NARROW}
                            >
                              {r.DIFF_BILLS_APP === 0
                                ? "0"
                                : r.DIFF_BILLS_APP.toLocaleString()}
                            </td>
                            <td
                              className={`${TD_R} bg-indigo-200/50 font-semibold ${diffCls(r.DIFF_SALE_APP)}`}
                              style={ARIAL_NARROW}
                            >
                              {fmtDiff(r.DIFF_SALE_APP)}
                            </td>
                            {/* POS-TouBee */}
                            <td
                              className={`${TD_R} bg-orange-50/40`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.BILLS_POS_TOUBEE)}
                            </td>
                            <td
                              className={`${TD_R} bg-orange-50/40 text-orange-700`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.SALE_POS_TOUBEE)}
                            </td>
                            {/* POS-SCN */}
                            <td
                              className={`${TD_R} bg-amber-50/40`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.BILLS_POS_SCN)}
                            </td>
                            <td
                              className={`${TD_R} bg-amber-50/40 text-amber-700`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.SALE_POS_SCN)}
                            </td>
                            {/* POS total */}
                            <td
                              className={`${TD_R} bg-orange-100/50 font-semibold`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.TOTAL_BILLS_POS)}
                            </td>
                            <td
                              className={`${TD_R} bg-orange-100/50 font-semibold text-orange-800`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.TOTAL_SALE_POS)}
                            </td>
                            {/* POS Diff */}
                            <td
                              className={`${TD_R} bg-orange-200/50 font-semibold ${diffCls(r.DIFF_BILLS_POS)}`}
                              style={ARIAL_NARROW}
                            >
                              {r.DIFF_BILLS_POS === 0
                                ? "0"
                                : r.DIFF_BILLS_POS.toLocaleString()}
                            </td>
                            <td
                              className={`${TD_R} bg-orange-200/50 font-semibold ${diffCls(r.DIFF_SALE_POS)}`}
                              style={ARIAL_NARROW}
                            >
                              {fmtDiff(r.DIFF_SALE_POS)}
                            </td>
                            {/* Grand Total */}
                            <td
                              className={`${TD_R} font-semibold`}
                              style={ARIAL_NARROW}
                            >
                              {fmtInt(r.TOTAL_BILLS_ALL)}
                            </td>
                            <td
                              className={`${TD_R} font-semibold text-slate-700`}
                              style={ARIAL_NARROW}
                            >
                              {fmt(r.TOTAL_SALE_ALL)}
                            </td>
                            {/* Grand Diff */}
                            <td
                              className={`${TD_R} font-semibold ${diffCls(r.DIFF_BILLS_ALL)}`}
                              style={ARIAL_NARROW}
                            >
                              {r.DIFF_BILLS_ALL === 0
                                ? "0"
                                : r.DIFF_BILLS_ALL.toLocaleString()}
                            </td>
                            <td
                              className={`${TD_R} font-semibold ${diffCls(r.DIFF_SALE_ALL)}`}
                              style={ARIAL_NARROW}
                            >
                              {fmtDiff(r.DIFF_SALE_ALL)}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Grand total */}
                      <tr className="bg-gray-300 font-bold text-sm">
                        <td className={`${TD_C} font-bold`} colSpan={2}>
                          ລວມທັງໝົດ
                        </td>
                        {/* APP-Sokxay */}
                        <td className={`${TD_R}`} style={ARIAL_NARROW}>
                          {fmtInt(grandDraw.BILLS_APP_SOKXAY)}
                        </td>
                        <td
                          className={`${TD_R} text-indigo-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandDraw.SALE_APP_SOKXAY)}
                        </td>
                        {/* APP-SCN */}
                        <td className={`${TD_R}`} style={ARIAL_NARROW}>
                          {fmtInt(grandDraw.BILLS_APP_SCN)}
                        </td>
                        <td
                          className={`${TD_R} text-cyan-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandDraw.SALE_APP_SCN)}
                        </td>
                        {/* APP total */}
                        <td className={`${TD_R}`} style={ARIAL_NARROW}>
                          {fmtInt(grandDraw.TOTAL_BILLS_APP)}
                        </td>
                        <td
                          className={`${TD_R} text-indigo-900`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandDraw.TOTAL_SALE_APP)}
                        </td>
                        {/* APP Diff */}
                        <td
                          className={`${TD_R} font-bold ${
                            grandDraw.DIFF_BILLS_APP < 0
                              ? "text-red-700"
                              : grandDraw.DIFF_BILLS_APP === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {grandDraw.DIFF_BILLS_APP === 0
                            ? "0"
                            : grandDraw.DIFF_BILLS_APP.toLocaleString()}
                        </td>
                        <td
                          className={`${TD_R} font-bold ${
                            grandDraw.DIFF_SALE_APP < 0
                              ? "text-red-700"
                              : grandDraw.DIFF_SALE_APP === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {fmtDiff(grandDraw.DIFF_SALE_APP)}
                        </td>
                        {/* POS-TouBee */}
                        <td
                          className={`${TD_R} text-orange-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmtInt(grandDraw.BILLS_POS_TOUBEE)}
                        </td>
                        <td
                          className={`${TD_R} text-orange-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandDraw.SALE_POS_TOUBEE)}
                        </td>
                        {/* POS-SCN */}
                        <td
                          className={`${TD_R} text-amber-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmtInt(grandDraw.BILLS_POS_SCN)}
                        </td>
                        <td
                          className={`${TD_R} text-amber-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandDraw.SALE_POS_SCN)}
                        </td>
                        {/* POS total */}
                        <td className={`${TD_R}`} style={ARIAL_NARROW}>
                          {fmtInt(grandDraw.TOTAL_BILLS_POS)}
                        </td>
                        <td
                          className={`${TD_R} text-orange-900`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandDraw.TOTAL_SALE_POS)}
                        </td>
                        {/* POS Diff */}
                        <td
                          className={`${TD_R} font-bold ${
                            grandDraw.DIFF_BILLS_POS < 0
                              ? "text-red-700"
                              : grandDraw.DIFF_BILLS_POS === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {grandDraw.DIFF_BILLS_POS === 0
                            ? "0"
                            : grandDraw.DIFF_BILLS_POS.toLocaleString()}
                        </td>
                        <td
                          className={`${TD_R} font-bold ${
                            grandDraw.DIFF_SALE_POS < 0
                              ? "text-red-700"
                              : grandDraw.DIFF_SALE_POS === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {fmtDiff(grandDraw.DIFF_SALE_POS)}
                        </td>
                        {/* Grand total */}
                        <td className={`${TD_R}`} style={ARIAL_NARROW}>
                          {fmtInt(grandDraw.TOTAL_BILLS_ALL)}
                        </td>
                        <td className={`${TD_R}`} style={ARIAL_NARROW}>
                          {fmt(grandDraw.TOTAL_SALE_ALL)}
                        </td>
                        {/* Grand Diff */}
                        <td
                          className={`${TD_R} font-bold ${
                            grandDraw.DIFF_BILLS_ALL < 0
                              ? "text-red-700"
                              : grandDraw.DIFF_BILLS_ALL === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {grandDraw.DIFF_BILLS_ALL === 0
                            ? "0"
                            : grandDraw.DIFF_BILLS_ALL.toLocaleString()}
                        </td>
                        <td
                          className={`${TD_R} font-bold ${
                            grandDraw.DIFF_SALE_ALL < 0
                              ? "text-red-700"
                              : grandDraw.DIFF_SALE_ALL === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {fmtDiff(grandDraw.DIFF_SALE_ALL)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════ TAB: BY MONTH ═══════════════════════════════ */}
        {tab === "month" && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm no-print">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <Filter size={12} /> ເດືອນເລີ່ມຕົ້ນ (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={monthFrom}
                    onChange={(e) => setMonthFrom(e.target.value)}
                    className="w-40 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    style={ARIAL_NARROW}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">
                    ເດືອນສິ້ນສຸດ (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={monthTo}
                    onChange={(e) => setMonthTo(e.target.value)}
                    className="w-40 px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                    style={ARIAL_NARROW}
                  />
                </div>
                <div className="flex gap-2 pb-0.5">
                  <button
                    onClick={handleApplyMonth}
                    disabled={loadingMonth}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loadingMonth ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    ສະແດງຂໍ້ມູນ
                  </button>
                  {monthSearched && (
                    <button
                      onClick={handleClearMonth}
                      className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-100 transition-colors"
                    >
                      <X size={14} /> ລ້າງ
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                * ຖ້າບໍ່ລະບຸ ຈະດຶງຂໍ້ມູນທັງໝົດ
              </p>
            </div>

            {/* Table card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {/* Summary badges */}
              {monthSearched && !loadingMonth && sortedMonth.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-3 bg-slate-50 border-b border-slate-200 no-print text-xs">
                  <span className="font-semibold text-slate-600">
                    ທັງໝົດ{" "}
                    <span className="text-blue-700" style={ARIAL_NARROW}>
                      {sortedMonth.length}
                    </span>{" "}
                    ເດືອນ
                  </span>
                  <span className="font-semibold text-slate-600">
                    ຍອດລວມ:{" "}
                    <span className="text-slate-800" style={ARIAL_NARROW}>
                      {fmt(grandMonth.TOTAL_SALE_ALL)}
                    </span>
                  </span>
                  <span className="font-semibold text-indigo-700">
                    <Smartphone size={12} className="inline mr-1" />
                    APP ລວມ:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmt(grandMonth.TOTAL_SALE_APP)}
                    </span>
                  </span>
                  <span className="font-semibold text-orange-700">
                    <Monitor size={12} className="inline mr-1" />
                    POS:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmt(grandMonth.TOTAL_SALE_POS)}
                    </span>
                  </span>
                  <span
                    className={`font-semibold ${
                      grandMonth.DIFF_SALE_ALL < 0
                        ? "text-red-600"
                        : grandMonth.DIFF_SALE_ALL === 0
                          ? "text-emerald-600"
                          : "text-amber-600"
                    }`}
                  >
                    Diff:{" "}
                    <span style={ARIAL_NARROW}>
                      {fmtDiff(grandMonth.DIFF_SALE_ALL)}
                    </span>
                  </span>
                </div>
              )}

              {/* Loading */}
              {loadingMonth && (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
                  <RefreshCw size={20} className="animate-spin" />
                  <span className="text-sm">ກຳລັງໂຫຼດຂໍ້ມູນ...</span>
                </div>
              )}
              {monthError && !loadingMonth && (
                <div className="m-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3">
                  <AlertCircle size={16} /> {monthError}
                </div>
              )}
              {!loadingMonth &&
                !monthError &&
                monthSearched &&
                sortedMonth.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <FileSpreadsheet size={32} className="mb-2 opacity-40" />
                    <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ</p>
                  </div>
                )}
              {!monthSearched && !loadingMonth && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <CalendarDays size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">
                    ເລືອກເດືອນ ແລ້ວກົດ &quot;ສະແດງຂໍ້ມູນ&quot;
                  </p>
                </div>
              )}

              {!loadingMonth && !monthError && sortedMonth.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-yellow-200">
                        <th className={`${TH_NOCLICK} border-b-0`} rowSpan={2}>
                          ເດືອນ
                        </th>
                        {/* APP group: Sokxay(2) + SCN(2) + ລວມAPP(2) + DiffAPP(2) = 8 cols */}
                        <th
                          className={`${TH_NOCLICK} bg-indigo-100 text-indigo-800`}
                          colSpan={8}
                        >
                          <Smartphone size={12} className="inline mr-1" />
                          ຂາຍຜ່ານ APP
                        </th>
                        {/* POS group: TouBee(2) + SCN(2) + ລວມPOS(2) + DiffPOS(2) = 8 cols */}
                        <th
                          className={`${TH_NOCLICK} bg-orange-100 text-orange-800`}
                          colSpan={8}
                        >
                          <Monitor size={12} className="inline mr-1" />
                          ຂາຍຜ່ານ POS
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-slate-100`}
                          rowSpan={2}
                        >
                          ບິນທັງໝົດ
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-slate-100`}
                          rowSpan={2}
                        >
                          ຍອດລວມ
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-red-100 text-red-800`}
                          rowSpan={2}
                        >
                          Diff ບິນ
                        </th>
                        <th
                          className={`${TH_NOCLICK} border-b-0 bg-red-100 text-red-800`}
                          rowSpan={2}
                        >
                          Diff ຍອດ
                        </th>
                      </tr>
                      <tr className="bg-yellow-100">
                        {/* APP-Sokxay */}
                        <th
                          className={`${TH} bg-indigo-50 text-indigo-700`}
                          onClick={() => toggleMonthSort("BILLS_APP_SOKXAY")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            Sokxay ບິນ{" "}
                            <SortIcon col="BILLS_APP_SOKXAY" sort={monthSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-indigo-50 text-indigo-700`}
                          onClick={() => toggleMonthSort("SALE_APP_SOKXAY")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            Sokxay ຍອດ{" "}
                            <SortIcon col="SALE_APP_SOKXAY" sort={monthSort} />
                          </span>
                        </th>
                        {/* APP-SCN */}
                        <th
                          className={`${TH} bg-cyan-50 text-cyan-700`}
                          onClick={() => toggleMonthSort("BILLS_APP_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ບິນ{" "}
                            <SortIcon col="BILLS_APP_SCN" sort={monthSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-cyan-50 text-cyan-700`}
                          onClick={() => toggleMonthSort("SALE_APP_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ຍອດ{" "}
                            <SortIcon col="SALE_APP_SCN" sort={monthSort} />
                          </span>
                        </th>
                        {/* APP total */}
                        <th className={`${TH_NOCLICK} bg-indigo-100 font-bold`}>
                          ລວມ APP ບິນ
                        </th>
                        <th className={`${TH_NOCLICK} bg-indigo-100 font-bold`}>
                          ລວມ APP ຍອດ
                        </th>
                        {/* APP Diff */}
                        <th
                          className={`${TH_NOCLICK} bg-indigo-200 text-indigo-800 font-bold`}
                        >
                          Diff APP ບິນ
                        </th>
                        <th
                          className={`${TH_NOCLICK} bg-indigo-200 text-indigo-800 font-bold`}
                        >
                          Diff APP ຍອດ
                        </th>
                        {/* POS-TouBee */}
                        <th
                          className={`${TH} bg-orange-50 text-orange-700`}
                          onClick={() => toggleMonthSort("BILLS_POS_TOUBEE")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            TouBee ບິນ{" "}
                            <SortIcon col="BILLS_POS_TOUBEE" sort={monthSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-orange-50 text-orange-700`}
                          onClick={() => toggleMonthSort("SALE_POS_TOUBEE")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            TouBee ຍອດ{" "}
                            <SortIcon col="SALE_POS_TOUBEE" sort={monthSort} />
                          </span>
                        </th>
                        {/* POS-SCN */}
                        <th
                          className={`${TH} bg-amber-50 text-amber-700`}
                          onClick={() => toggleMonthSort("BILLS_POS_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ບິນ{" "}
                            <SortIcon col="BILLS_POS_SCN" sort={monthSort} />
                          </span>
                        </th>
                        <th
                          className={`${TH} bg-amber-50 text-amber-700`}
                          onClick={() => toggleMonthSort("SALE_POS_SCN")}
                        >
                          <span className="flex items-center justify-center gap-1">
                            SCN ຍອດ{" "}
                            <SortIcon col="SALE_POS_SCN" sort={monthSort} />
                          </span>
                        </th>
                        {/* POS total */}
                        <th className={`${TH_NOCLICK} bg-orange-100 font-bold`}>
                          ລວມ POS ບິນ
                        </th>
                        <th className={`${TH_NOCLICK} bg-orange-100 font-bold`}>
                          ລວມ POS ຍອດ
                        </th>
                        {/* POS Diff */}
                        <th
                          className={`${TH_NOCLICK} bg-orange-200 text-orange-800 font-bold`}
                        >
                          Diff POS ບິນ
                        </th>
                        <th
                          className={`${TH_NOCLICK} bg-orange-200 text-orange-800 font-bold`}
                        >
                          Diff POS ຍອດ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMonth.map((r) => (
                        <tr key={r.SALE_MONTH} className="hover:bg-slate-50">
                          <td
                            className={`${TD_C} text-violet-700 font-semibold`}
                            style={ARIAL_NARROW}
                          >
                            {r.SALE_MONTH}
                          </td>
                          {/* APP-Sokxay */}
                          <td
                            className={`${TD_R} bg-indigo-50/40`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.BILLS_APP_SOKXAY)}
                          </td>
                          <td
                            className={`${TD_R} bg-indigo-50/40 text-indigo-700`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.SALE_APP_SOKXAY)}
                          </td>
                          {/* APP-SCN */}
                          <td
                            className={`${TD_R} bg-cyan-50/40`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.BILLS_APP_SCN)}
                          </td>
                          <td
                            className={`${TD_R} bg-cyan-50/40 text-cyan-700`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.SALE_APP_SCN)}
                          </td>
                          {/* APP total */}
                          <td
                            className={`${TD_R} bg-indigo-100/50 font-semibold`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.TOTAL_BILLS_APP)}
                          </td>
                          <td
                            className={`${TD_R} bg-indigo-100/50 font-semibold text-indigo-800`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.TOTAL_SALE_APP)}
                          </td>
                          {/* APP Diff */}
                          <td
                            className={`${TD_R} bg-indigo-200/50 font-semibold ${diffCls(r.DIFF_BILLS_APP)}`}
                            style={ARIAL_NARROW}
                          >
                            {r.DIFF_BILLS_APP === 0
                              ? "0"
                              : r.DIFF_BILLS_APP.toLocaleString()}
                          </td>
                          <td
                            className={`${TD_R} bg-indigo-200/50 font-semibold ${diffCls(r.DIFF_SALE_APP)}`}
                            style={ARIAL_NARROW}
                          >
                            {fmtDiff(r.DIFF_SALE_APP)}
                          </td>
                          {/* POS-TouBee */}
                          <td
                            className={`${TD_R} bg-orange-50/40`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.BILLS_POS_TOUBEE)}
                          </td>
                          <td
                            className={`${TD_R} bg-orange-50/40 text-orange-700`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.SALE_POS_TOUBEE)}
                          </td>
                          {/* POS-SCN */}
                          <td
                            className={`${TD_R} bg-amber-50/40`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.BILLS_POS_SCN)}
                          </td>
                          <td
                            className={`${TD_R} bg-amber-50/40 text-amber-700`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.SALE_POS_SCN)}
                          </td>
                          {/* POS total */}
                          <td
                            className={`${TD_R} bg-orange-100/50 font-semibold`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.TOTAL_BILLS_POS)}
                          </td>
                          <td
                            className={`${TD_R} bg-orange-100/50 font-semibold text-orange-800`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.TOTAL_SALE_POS)}
                          </td>
                          {/* POS Diff */}
                          <td
                            className={`${TD_R} bg-orange-200/50 font-semibold ${diffCls(r.DIFF_BILLS_POS)}`}
                            style={ARIAL_NARROW}
                          >
                            {r.DIFF_BILLS_POS === 0
                              ? "0"
                              : r.DIFF_BILLS_POS.toLocaleString()}
                          </td>
                          <td
                            className={`${TD_R} bg-orange-200/50 font-semibold ${diffCls(r.DIFF_SALE_POS)}`}
                            style={ARIAL_NARROW}
                          >
                            {fmtDiff(r.DIFF_SALE_POS)}
                          </td>
                          {/* Grand total */}
                          <td
                            className={`${TD_R} font-semibold`}
                            style={ARIAL_NARROW}
                          >
                            {fmtInt(r.TOTAL_BILLS_ALL)}
                          </td>
                          <td
                            className={`${TD_R} font-semibold text-slate-700`}
                            style={ARIAL_NARROW}
                          >
                            {fmt(r.TOTAL_SALE_ALL)}
                          </td>
                          {/* Grand Diff */}
                          <td
                            className={`${TD_R} font-semibold ${diffCls(r.DIFF_BILLS_ALL)}`}
                            style={ARIAL_NARROW}
                          >
                            {r.DIFF_BILLS_ALL === 0
                              ? "0"
                              : r.DIFF_BILLS_ALL.toLocaleString()}
                          </td>
                          <td
                            className={`${TD_R} font-semibold ${diffCls(r.DIFF_SALE_ALL)}`}
                            style={ARIAL_NARROW}
                          >
                            {fmtDiff(r.DIFF_SALE_ALL)}
                          </td>
                        </tr>
                      ))}

                      {/* Grand total */}
                      <tr className="bg-gray-300 font-bold text-sm">
                        <td className={`${TD_C} font-bold`}>ລວມທັງໝົດ</td>
                        {/* APP-Sokxay */}
                        <td className={TD_R} style={ARIAL_NARROW}>
                          {fmtInt(grandMonth.BILLS_APP_SOKXAY)}
                        </td>
                        <td
                          className={`${TD_R} text-indigo-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandMonth.SALE_APP_SOKXAY)}
                        </td>
                        {/* APP-SCN */}
                        <td className={TD_R} style={ARIAL_NARROW}>
                          {fmtInt(grandMonth.BILLS_APP_SCN)}
                        </td>
                        <td
                          className={`${TD_R} text-cyan-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandMonth.SALE_APP_SCN)}
                        </td>
                        {/* APP total */}
                        <td className={TD_R} style={ARIAL_NARROW}>
                          {fmtInt(grandMonth.TOTAL_BILLS_APP)}
                        </td>
                        <td
                          className={`${TD_R} text-indigo-900`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandMonth.TOTAL_SALE_APP)}
                        </td>
                        {/* APP Diff */}
                        <td
                          className={`${TD_R} font-bold ${
                            grandMonth.DIFF_BILLS_APP < 0
                              ? "text-red-700"
                              : grandMonth.DIFF_BILLS_APP === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {grandMonth.DIFF_BILLS_APP === 0
                            ? "0"
                            : grandMonth.DIFF_BILLS_APP.toLocaleString()}
                        </td>
                        <td
                          className={`${TD_R} font-bold ${
                            grandMonth.DIFF_SALE_APP < 0
                              ? "text-red-700"
                              : grandMonth.DIFF_SALE_APP === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {fmtDiff(grandMonth.DIFF_SALE_APP)}
                        </td>
                        {/* POS-TouBee */}
                        <td
                          className={`${TD_R} text-orange-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmtInt(grandMonth.BILLS_POS_TOUBEE)}
                        </td>
                        <td
                          className={`${TD_R} text-orange-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandMonth.SALE_POS_TOUBEE)}
                        </td>
                        {/* POS-SCN */}
                        <td
                          className={`${TD_R} text-amber-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmtInt(grandMonth.BILLS_POS_SCN)}
                        </td>
                        <td
                          className={`${TD_R} text-amber-800`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandMonth.SALE_POS_SCN)}
                        </td>
                        {/* POS total */}
                        <td className={TD_R} style={ARIAL_NARROW}>
                          {fmtInt(grandMonth.TOTAL_BILLS_POS)}
                        </td>
                        <td
                          className={`${TD_R} text-orange-900`}
                          style={ARIAL_NARROW}
                        >
                          {fmt(grandMonth.TOTAL_SALE_POS)}
                        </td>
                        {/* POS Diff */}
                        <td
                          className={`${TD_R} font-bold ${
                            grandMonth.DIFF_BILLS_POS < 0
                              ? "text-red-700"
                              : grandMonth.DIFF_BILLS_POS === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {grandMonth.DIFF_BILLS_POS === 0
                            ? "0"
                            : grandMonth.DIFF_BILLS_POS.toLocaleString()}
                        </td>
                        <td
                          className={`${TD_R} font-bold ${
                            grandMonth.DIFF_SALE_POS < 0
                              ? "text-red-700"
                              : grandMonth.DIFF_SALE_POS === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {fmtDiff(grandMonth.DIFF_SALE_POS)}
                        </td>
                        {/* Grand total */}
                        <td className={TD_R} style={ARIAL_NARROW}>
                          {fmtInt(grandMonth.TOTAL_BILLS_ALL)}
                        </td>
                        <td className={TD_R} style={ARIAL_NARROW}>
                          {fmt(grandMonth.TOTAL_SALE_ALL)}
                        </td>
                        {/* Grand Diff */}
                        <td
                          className={`${TD_R} font-bold ${
                            grandMonth.DIFF_BILLS_ALL < 0
                              ? "text-red-700"
                              : grandMonth.DIFF_BILLS_ALL === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {grandMonth.DIFF_BILLS_ALL === 0
                            ? "0"
                            : grandMonth.DIFF_BILLS_ALL.toLocaleString()}
                        </td>
                        <td
                          className={`${TD_R} font-bold ${
                            grandMonth.DIFF_SALE_ALL < 0
                              ? "text-red-700"
                              : grandMonth.DIFF_SALE_ALL === 0
                                ? "text-emerald-700"
                                : "text-amber-700"
                          }`}
                          style={ARIAL_NARROW}
                        >
                          {fmtDiff(grandMonth.DIFF_SALE_ALL)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

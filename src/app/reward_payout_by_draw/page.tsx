"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw, Search, AlertCircle, BarChart3, Printer, X, Filter, Scale, FileDown,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import PageSkeleton from "@/components/PageSkeleton";
import { logActivity } from "@/lib/activityService";
import { exportRewardPayoutByDraw } from "@/lib/ExportRewardPayoutByDraw";

// ── Types ────────────────────────────────────────────────────────────────────

interface FlatRow {
  DRAWID:         string;
  DRAWDATE:       string;        // YYYY-MM-DD
  REWARD_TOTAL:   number;
  REWARD_COUNT:   number;
  TAX_TOTAL:      number;        // ອາກອນ 5% ຂອງລາຍການ (ບິນ) ຖືກລາງວັນ >= 50 ລ້ານ ຕໍ່ 1 ງວດ
  PAYOUT_DRAW_ID: string | null;
  PAYOUT_DATE:    string | null; // YYYY-MM-DD
  PAYOUT_TOTAL:   number;
  PAYOUT_COUNT:   number;
}

export interface PayoutDetail {
  PAYOUT_DRAW_ID: string | null;
  PAYOUT_DATE:    string;
  PAYOUT_TOTAL:   number;
  PAYOUT_COUNT:   number;
}

export interface DrawGroup {
  DRAWID:           string;
  DRAWDATE:         string;
  REWARD_TOTAL:     number;
  REWARD_COUNT:     number;
  TAX_TOTAL:        number; // ລວມອາກອນ 5% (ຈາກລາຍການຖືກລາງວັນ >= 50 ລ້ານ)
  PAYOUT_TOTAL_SUM: number;
  PAYOUT_COUNT_SUM: number;
  DIFF:             number; // ຜົນຕ່າງ ຈຳນວນເງິນ (REWARD_TOTAL - (PAYOUT_TOTAL_SUM + TAX_TOTAL))
  DIFF_COUNT:       number; // ຜົນຕ່າງ ຈຳນວນບິນ/ຈຳນວນ (REWARD_COUNT - PAYOUT_COUNT_SUM)
  DAYS_SINCE_DRAW:  number;
  IS_MATCHED:       boolean; // green — ຍອດ REWARD ກັບ ຍອດ PAYOUT ລວມ ຕົງກັນ
  IS_RECENT:        boolean; // yellow — ງວດຍັງບໍ່ກາຍ 15 ມື້
  payouts:          PayoutDetail[];
}

type SortKey = "DRAWID" | "DRAWDATE" | "REWARD_TOTAL" | "PAYOUT_TOTAL_SUM" | "DIFF" | "DIFF_COUNT";
type SortDir = "asc" | "desc";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt  = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtN = (n: number | null | undefined) => (n == null ? 0 : Number(n));
const fmtDate = (s: string | null | undefined) => {
  if (!s) return "-";
  const d = String(s).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(s).slice(0, 10);
};

export const DAYS_THRESHOLD = 15;

function daysSince(dateStr: string): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return Infinity;
  const today = new Date();
  const ms = today.setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0);
  return Math.floor(ms / 86400000);
}

/** ລວມ flat rows (reward × payout_date) ໃຫ້ເປັນ group ຕໍ່ 1 ງວດ, ຄືກັນກັບຮູບແບບໃນ Excel ຕົ້ນສະບັບ */
function groupByDraw(rows: FlatRow[]): DrawGroup[] {
  const map = new Map<string, DrawGroup>();
  for (const r of rows) {
    let g = map.get(r.DRAWID);
    if (!g) {
      g = {
        DRAWID: r.DRAWID,
        DRAWDATE: r.DRAWDATE,
        REWARD_TOTAL: fmtN(r.REWARD_TOTAL),
        REWARD_COUNT: fmtN(r.REWARD_COUNT),
        TAX_TOTAL: fmtN(r.TAX_TOTAL),
        PAYOUT_TOTAL_SUM: 0,
        PAYOUT_COUNT_SUM: 0,
        DIFF: 0,
        DIFF_COUNT: 0,
        DAYS_SINCE_DRAW: daysSince(r.DRAWDATE),
        IS_MATCHED: false,
        IS_RECENT: false,
        payouts: [],
      };
      map.set(r.DRAWID, g);
    }
    if (r.PAYOUT_DATE) {
      g.payouts.push({
        PAYOUT_DRAW_ID: r.PAYOUT_DRAW_ID,
        PAYOUT_DATE: r.PAYOUT_DATE,
        PAYOUT_TOTAL: fmtN(r.PAYOUT_TOTAL),
        PAYOUT_COUNT: fmtN(r.PAYOUT_COUNT),
      });
      g.PAYOUT_TOTAL_SUM += fmtN(r.PAYOUT_TOTAL);
      g.PAYOUT_COUNT_SUM += fmtN(r.PAYOUT_COUNT);
    }
  }
  const groups = Array.from(map.values());
  // ຮຽງລໍາດັບວັນທີ່ຈ່າຍ ພາຍໃນແຕ່ລະງວດ
  for (const g of groups) {
    g.payouts.sort((a, b) => a.PAYOUT_DATE.localeCompare(b.PAYOUT_DATE));
    g.DIFF = Math.round((g.REWARD_TOTAL - (g.PAYOUT_TOTAL_SUM + g.TAX_TOTAL)) * 100) / 100;
    g.DIFF_COUNT = g.REWARD_COUNT - g.PAYOUT_COUNT_SUM;
    g.IS_MATCHED = g.DIFF === 0 && g.REWARD_TOTAL > 0;
    g.IS_RECENT  = !g.IS_MATCHED && g.DAYS_SINCE_DRAW <= DAYS_THRESHOLD;
  }
  return groups;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RewardPayoutByDrawPage() {
  const { user, perm } = useAuth();

  const [flatRows,   setFlatRows]   = useState<FlatRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError,   setRowsError]  = useState<string | null>(null);

  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo,   setDrawTo]   = useState("");
  const [search,   setSearch]   = useState("");
  const [sort]     = useState<{ key: SortKey; dir: SortDir }>({ key: "DRAWID", dir: "asc" });

  const [appliedDrawFrom, setAppliedDrawFrom] = useState("");
  const [appliedDrawTo,   setAppliedDrawTo]   = useState("");
  const [appliedSearch,   setAppliedSearch]   = useState("");
  const [hasSearched,     setHasSearched]     = useState(false);

  const [printTime, setPrintTime] = useState("");

  useEffect(() => { setPrintTime(new Date().toLocaleString("lo-LA")); }, []);

  const fetchRows = async (from: string, to: string) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "reward_payout_by_draw" });
      if (from) qs.set("from", from);
      if (to)   qs.set("to", to);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setFlatRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: unknown) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedDrawFrom(drawFrom);
    setAppliedDrawTo(drawTo);
    setAppliedSearch(search);
    setHasSearched(true);
    fetchRows(drawFrom, drawTo);
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "reward_payout_by_draw_search",
      detail: `ງວດ: ${drawFrom || ""}~${drawTo || ""} ${search || ""}`.trim(),
    });
  };

  const clearFilters = () => {
    setDrawFrom(""); setDrawTo(""); setSearch("");
    setAppliedDrawFrom(""); setAppliedDrawTo(""); setAppliedSearch("");
    setHasSearched(false);
    setFlatRows([]);
  };

  const groups = useMemo(() => groupByDraw(flatRows), [flatRows]);

  const filtered = useMemo(() => {
    if (!hasSearched) return [];
    const q = appliedSearch.trim().toLowerCase();
    const data = groups.filter(g => (q ? g.DRAWID.toLowerCase().includes(q) : true));
    return [...data].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [groups, appliedSearch, sort, hasSearched]);

  const grandTotal = useMemo(() => ({
    REWARD_TOTAL:     filtered.reduce((s, g) => s + g.REWARD_TOTAL, 0),
    REWARD_COUNT:     filtered.reduce((s, g) => s + g.REWARD_COUNT, 0),
    TAX_TOTAL:        filtered.reduce((s, g) => s + g.TAX_TOTAL, 0),
    PAYOUT_TOTAL_SUM: filtered.reduce((s, g) => s + g.PAYOUT_TOTAL_SUM, 0),
    PAYOUT_COUNT_SUM: filtered.reduce((s, g) => s + g.PAYOUT_COUNT_SUM, 0),
    DIFF:             filtered.reduce((s, g) => s + g.DIFF, 0),
    DIFF_COUNT:       filtered.reduce((s, g) => s + g.DIFF_COUNT, 0),
    MATCHED_COUNT:    filtered.filter(g => g.IS_MATCHED).length,
  }), [filtered]);

  const hasFilter = drawFrom || drawTo || search;

  const filterSummary = [
    appliedDrawFrom && `ງວດ ຈາກ: ${appliedDrawFrom}`,
    appliedDrawTo   && `ງວດ ຫາ: ${appliedDrawTo}`,
    appliedSearch   && `ຄົ້ນຫາ: "${appliedSearch}"`,
  ].filter(Boolean).join("  |  ");

  const handleExport = async () => {
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "reward_payout_by_draw_export",
      detail: `Export: ${appliedDrawFrom || ""}~${appliedDrawTo || ""} (${filtered.length} ງວດ)`,
    });
    await exportRewardPayoutByDraw(filtered, appliedDrawFrom, appliedDrawTo, user?.displayName ?? "");
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "reward_payout_by_draw_print",
      detail: `Print: ${appliedDrawFrom || ""}~${appliedDrawTo || ""} (${filtered.length} ງວດ)`,
    });
    window.print();
  };

  const PRINT_CSS = `
    @media print {
      @page { size: A4 landscape; margin: 12mm; }
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area { position: absolute; top: 0; left: 0; width: 100%; padding: 0; }
      .no-print { display: none !important; }
      * { font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important; color: #000 !important; }
      table { font-size: 9px !important; width: 100% !important; border-collapse: collapse !important; }
      th, td { padding: 3px 5px !important; border: 1px solid #000 !important; }
      tr.matched-row td   { background: #d1f5e0 !important; }
      tr.recent-row td    { background: #fff6cc !important; }
      tr.grandtotal-row td{ background: #d0d0d0 !important; font-weight: bold !important; }
      tr { page-break-inside: avoid; }
    }
  `;

  const TH = "px-3 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50 border border-black text-[11px]";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Scale size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານຍອດຈ່າຍລາງວັນແຕ່ລະງວດ (REWARD ⇄ PAYOUT)</h1>
              <p className="text-xs text-slate-400">LOTLINK_REWARD × LOTLINK_PAYOUT — join ຜ່ານ DRAW_DATE</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchRows(appliedDrawFrom, appliedDrawTo)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black text-slate-600 hover:bg-slate-50 transition">
              <RefreshCw size={13} className={loadingRows ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
            </button>
            {perm("issue_print") && (
              <>
                <button onClick={handleExport} disabled={filtered.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
                  <FileDown size={13} /> Export Excel
                </button>
                <button onClick={handlePrint} disabled={filtered.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition">
                  <Printer size={13} /> ພິມ A4
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="no-print flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400 inline-block" /> ແຖວລວມ ຍອດຈ່າຍຕົງກັນ (REWARD = PAYOUT)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400 inline-block" /> ງວດຍັງບໍ່ກາຍ {DAYS_THRESHOLD} ມື້ (ຍັງລໍຖ້າຈ່າຍ)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-red-400 inline-block" /> <span className="text-red-600 font-semibold">ຕົວເລກສີແດງ</span> = ຍັງມີຜົນຕ່າງ (REWARD ≠ PAYOUT)</span>
        </div>

        {/* ── Filter ── */}
        <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດທີ ຈາກ</label>
            <input value={drawFrom} onChange={e => setDrawFrom(e.target.value)}
              placeholder="ຕົວຢ່າງ: 26050"
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດທີ ຫາ</label>
            <input value={drawTo} onChange={e => setDrawTo(e.target.value)}
              placeholder="ຕົວຢ່າງ: 26070"
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ ງວດທີ</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                placeholder="ຄົ້ນຫາ..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleApplyFilter} disabled={loadingRows}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">
              {loadingRows
                ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງ
              </button>
            )}
            <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
              {loadingRows ? "ກໍາລັງດຶງ..." : hasSearched ? `${filtered.length.toLocaleString()} ງວດ` : "-"}
            </span>
          </div>
        </div>

        {/* ── Print top info ── */}
        <div className="hidden print:block" style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
            <div>
              {user?.displayName && <div>ຜູ້ພິມ: <strong>{user.displayName}</strong></div>}
              <div>ວັນ-ເວລາພິມ: {printTime}</div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>ລາຍງານຍອດຈ່າຍລາງວັນແຕ່ລະງວດ</div>
            </div>
            <div style={{ width: 120 }} />
          </div>
        </div>

        {rowsError && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{rowsError}</p>
            </div>
          </div>
        )}

        {/* ── Table (flat layout: reward once ⟶ payout rows ⟶ ລວມ row, per draw) ── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loadingRows ? (
            <PageSkeleton variant="flat" cols={11} rows={12} />
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">ໃສ່ຊ່ວງງວດ (ຫຼືປ່ອຍວ່າງເພື່ອທັງໝົດ) ແລ້ວກົດ <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>ວັນທີ</th>
                    <th className={TH}>ງວດ</th>
                    <th className={TH}>ຈຳນວນເງິນຖືກລາງວັນ</th>
                    <th className={TH}>ຈຳນວນບິນຖືກລາງວັນ</th>
                    <th className={TH}>ງວດ</th>
                    <th className={TH}>ຈຳນວນເງີນ</th>
                    <th className={TH}>ຈຳນວນເບີກຈ່າຍ</th>
                    <th className={TH}>ວັນທີເບີກຈ່າຍ</th>
                    <th className={TH}>ລວມອາກອນ 5%</th>
                    <th className={TH}>ຜົນຕ່າງ ຈຳນວນເງິນ</th>
                    <th className={TH}>ຜົນຕ່າງ ຈຳນວນ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-16 text-slate-400">
                      <Scale size={32} className="mx-auto mb-2 opacity-30" />
                      <p>ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ</p>
                    </td></tr>
                  ) : (
                    <>
                      {filtered.map((g) => {
                        const totalRowClass = g.IS_MATCHED
                          ? "matched-row bg-emerald-100 font-bold"
                          : g.IS_RECENT
                            ? "recent-row bg-yellow-100 font-bold"
                            : "bg-gray-100 font-bold";
                        const rows = g.payouts.length > 0 ? g.payouts : [null];
                        return (
                          <React.Fragment key={g.DRAWID}>
                            {rows.map((p, idx) => (
                              <tr key={`${g.DRAWID}-${idx}`} className="hover:bg-blue-50">
                                <td className="px-3 py-1.5 text-center border border-black">{idx === 0 ? fmtDate(g.DRAWDATE) : ""}</td>
                                <td className="px-3 py-1.5 text-center font-mono text-blue-700 font-semibold border border-black">{idx === 0 ? g.DRAWID : ""}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{idx === 0 ? fmt(g.REWARD_TOTAL) : ""}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{idx === 0 ? fmt(g.REWARD_COUNT) : ""}</td>
                                <td className="px-3 py-1.5 text-center font-mono border border-black">{p ? (p.PAYOUT_DRAW_ID ?? "-") : "-"}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{p ? fmt(p.PAYOUT_TOTAL) : "-"}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{p ? fmt(p.PAYOUT_COUNT) : "-"}</td>
                                <td className="px-3 py-1.5 text-center border border-black">{p ? fmtDate(p.PAYOUT_DATE) : "-"}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{""}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{""}</td>
                                <td className="px-3 py-1.5 text-right font-mono border border-black">{""}</td>
                              </tr>
                            ))}
                            {/* ── ລວມ row ຕໍ່ງວດ — ຂຽວ = ຕົງກັນ, ເຫລືອງ = ຍັງບໍ່ກາຍ 15 ມື້ ── */}
                            <tr className={totalRowClass}>
                              <td className="px-3 py-2 text-center border border-black">ລວມ</td>
                              <td className="px-3 py-2 text-center font-mono border border-black">{g.DRAWID}</td>
                              <td className="px-3 py-2 text-right font-mono border border-black">{fmt(g.REWARD_TOTAL)}</td>
                              <td className="px-3 py-2 text-right font-mono border border-black">{fmt(g.REWARD_COUNT)}</td>
                              <td className="px-3 py-2 text-center font-mono border border-black">{g.payouts[0]?.PAYOUT_DRAW_ID ?? "-"}</td>
                              <td className="px-3 py-2 text-right font-mono border border-black">{fmt(g.PAYOUT_TOTAL_SUM)}</td>
                              <td className="px-3 py-2 text-right font-mono border border-black">{fmt(g.PAYOUT_COUNT_SUM)}</td>
                              <td className="px-3 py-2 text-center border border-black">
                                {Number.isFinite(g.DAYS_SINCE_DRAW) ? `${g.DAYS_SINCE_DRAW}ມື້` : "-"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono border border-black">
                                {fmt(g.TAX_TOTAL)}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono border border-black ${g.DIFF !== 0 ? "text-red-600" : ""}`}>
                                {fmt(g.DIFF)}
                              </td>
                              <td className={`px-3 py-2 text-right font-mono border border-black ${g.DIFF_COUNT !== 0 ? "text-red-600" : ""}`}>
                                {fmt(g.DIFF_COUNT)}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}

                      <tr className="grandtotal-row bg-gray-300 font-bold">
                        <td className="px-3 py-2 text-center border border-black" colSpan={2}>ລວມທັງໝົດ ({grandTotal.MATCHED_COUNT}/{filtered.length} ງວດຄົບຖ້ວນ)</td>
                        <td className="px-3 py-2 text-right font-mono border border-black">{fmt(grandTotal.REWARD_TOTAL)}</td>
                        <td className="px-3 py-2 text-right font-mono border border-black">{fmt(grandTotal.REWARD_COUNT)}</td>
                        <td className="px-3 py-2 border border-black" />
                        <td className="px-3 py-2 text-right font-mono border border-black">{fmt(grandTotal.PAYOUT_TOTAL_SUM)}</td>
                        <td className="px-3 py-2 text-right font-mono border border-black">{fmt(grandTotal.PAYOUT_COUNT_SUM)}</td>
                        <td className="px-3 py-2 border border-black" />
                        <td className="px-3 py-2 text-right font-mono border border-black">{fmt(grandTotal.TAX_TOTAL)}</td>
                        <td className={`px-3 py-2 text-right font-mono border border-black ${grandTotal.DIFF !== 0 ? "text-red-600" : ""}`}>
                          {fmt(grandTotal.DIFF)}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono border border-black ${grandTotal.DIFF_COUNT !== 0 ? "text-red-600" : ""}`}>
                          {fmt(grandTotal.DIFF_COUNT)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filterSummary && (
          <div className="hidden print:block" style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>
            ຕົວກອງ: {filterSummary}
          </div>
        )}
      </div>
    </>
  );
}

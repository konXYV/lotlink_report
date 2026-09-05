"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw, Search, FileSpreadsheet,
  AlertCircle, Printer, X, Filter, Gift, Layers,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import PageSkeleton from "@/components/PageSkeleton";
import { logActivity } from "@/lib/activityService";
import { exportScnRewardQuota, fetchScnRewardQuota, type QuotaRewardRow } from "@/lib/ExportScnRewardQuota";

interface QuotaRow {
  DRAW_DATE: string | null;
  DRAW_ID: string;
  QUOTA: string;
  PAYMENT_CHANNEL: string;
  AMOUNT: number;
  POINT_USE: number;
  DISCOUNT: number;
  AFTER_DISCOUNT: number;
  RECON: number;
  TOTAL_REWARD: number;
  TAX_REWARD: number;
  REWARD_AFTER_TAX: number;
  TOTAL_BONUS: number;
  TOTAL_WIN: number;
  MATCHWIN2: number;
  MATCHWIN3: number;
  ADJACENT2: number;
  ADJACENT2FRONT: number;
  ADJACENT3: number;
  ADJACENT3FRONT: number;
  ADJACENT4: number;
  ADJACENT5: number;
  ADJACENT6: number;
  RANDOM3: number;
  RANDOM4: number;
  RANDOM5: number;
  RANDOM6: number;
  INVOICE2: number;
  INVOICE3: number;
  INVOICE4: number;
  INVOICE5: number;
  INVOICE6: number;
}

type QuotaKey = "SCN" | "SOKXAY";

const fmt  = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtN = (n: number | null | undefined) => n == null ? 0 : Number(n);
const fmtDate = (s: string | null | undefined) => { if (!s) return "-"; const d = String(s).slice(0, 10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(s).slice(0, 10); };

type NumericQuotaKey = Exclude<keyof QuotaRow, "DRAW_DATE" | "DRAW_ID" | "QUOTA" | "PAYMENT_CHANNEL">;

// ── Main + Promo columns (order matches the source Excel template) ─────────
const MAIN_COLS: [NumericQuotaKey, string][] = [
  ["AMOUNT",          "Amount"],
  ["POINT_USE",       "Point Use"],
  ["DISCOUNT",        "Discount"],
  ["AFTER_DISCOUNT",  "After Discount"],
  ["RECON",           "Recon"],
  ["TOTAL_REWARD",    "Total Reward"],
  ["TAX_REWARD",      "Tax Reward"],
  ["REWARD_AFTER_TAX","Reward After Tax"],
  ["TOTAL_BONUS",     "Total Bonus"],
  ["TOTAL_WIN",       "Total Win"],
];

const PROMO_COLS: [NumericQuotaKey, string][] = [
  ["MATCHWIN2",      "ເລກ 6 ໂຕຖືກ 2 ໂຕໜ້າຫຼັງ"],
  ["MATCHWIN3",      "ເລກ 6 ໂຕຖືກ 3 ໂຕໜ້າຫຼັງ"],
  ["ADJACENT2",      "ຂ້າງຄຽງໜ້າ 2 ໂຕ"],
  ["ADJACENT2FRONT", "ຂ້າງຄຽງຫລັງ 2 ໂຕ"],
  ["ADJACENT3",      "ຂ້າງຄຽງໜ້າ 3 ໂຕ"],
  ["ADJACENT3FRONT", "ຂ້າງຄຽງຫລັງ 3 ໂຕ"],
  ["ADJACENT4",      "ຂ້າງຄຽງໜ້າ 4 ໂຕ"],
  ["ADJACENT5",      "ຂ້າງຄຽງໜ້າ 5 ໂຕ"],
  ["ADJACENT6",      "ຂ້າງຄຽງໜ້າ 6 ໂຕ"],
  ["RANDOM3",        "ສະຫຼັບ 3 ໂຕ"],
  ["RANDOM4",        "ສະຫຼັບ 4 ໂຕ"],
  ["RANDOM5",        "ສະຫຼັບ 5 ໂຕ"],
  ["RANDOM6",        "ສະຫຼັບ 6 ໂຕ"],
  ["INVOICE2",       "ທ້າຍບິນ 2 ໂຕ"],
  ["INVOICE3",       "ທ້າຍບິນ 3 ໂຕ"],
  ["INVOICE4",       "ທ້າຍບິນ 4 ໂຕ"],
  ["INVOICE5",       "ທ້າຍບິນ 5 ໂຕ"],
  ["INVOICE6",       "ທ້າຍບິນ 6 ໂຕ"],
];

const ALL_COLS = [...MAIN_COLS, ...PROMO_COLS];

function sumCols(rows: QuotaRow[]): Record<NumericQuotaKey, number> {
  const out = {} as Record<NumericQuotaKey, number>;
  for (const [key] of ALL_COLS) {
    out[key] = rows.reduce((s, r) => s + fmtN(r[key]), 0);
  }
  return out;
}

const QUOTA_TABS: { key: QuotaKey; label: string }[] = [
  { key: "SCN",    label: "Quota SCN" },
  { key: "SOKXAY", label: "Quota Sokxay" },
];

// Static Tailwind class strings per quota — Tailwind's compiler cannot see
// classes built from `bg-${var}-100` template literals, so every combination
// used anywhere in this page must appear here as a literal string.
const THEME: Record<QuotaKey, {
  iconBg: string; iconText: string;
  tabActive: string; tabInactive: string;
  filterBg: string; filterBorder: string; filterLabel: string;
  ring: string; drawText: string; rowHover: string;
}> = {
  SCN: {
    iconBg: "bg-blue-100", iconText: "text-blue-600",
    tabActive: "bg-blue-600 text-white border-blue-600",
    tabInactive: "bg-white text-slate-600 border-black hover:bg-slate-50",
    filterBg: "bg-blue-50", filterBorder: "border-blue-200", filterLabel: "text-blue-700",
    ring: "focus:ring-blue-500", drawText: "text-blue-700", rowHover: "hover:bg-blue-50",
  },
  SOKXAY: {
    iconBg: "bg-emerald-100", iconText: "text-emerald-600",
    tabActive: "bg-emerald-600 text-white border-emerald-600",
    tabInactive: "bg-white text-slate-600 border-black hover:bg-slate-50",
    filterBg: "bg-emerald-50", filterBorder: "border-emerald-200", filterLabel: "text-emerald-700",
    ring: "focus:ring-emerald-500", drawText: "text-emerald-700", rowHover: "hover:bg-emerald-50",
  },
};

export default function ScnRewardQuotaPage() {
  const { user, perm } = useAuth();

  const [quota, setQuota] = useState<QuotaKey>("SCN");

  const [rows,        setRows]        = useState<QuotaRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError,   setRowsError]   = useState<string | null>(null);
  const [exporting,   setExporting]   = useState(false);

  const [search,   setSearch]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedFrom,   setAppliedFrom]   = useState("");
  const [appliedTo,     setAppliedTo]     = useState("");
  const [hasSearched,   setHasSearched]   = useState(false);

  const fetchRows = useCallback(async (q: QuotaKey, from: string, to: string) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "scn_reward_quota", quota: q });
      if (from) qs.set("date_from", from);
      if (to)   qs.set("date_to",   to);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: unknown) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  }, []);

  const handleApplyFilter = () => {
    setAppliedSearch(search);
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setHasSearched(true);
    fetchRows(quota, dateFrom, dateTo);
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "reward_search", detail: `Quota: ${quota} ${dateFrom || ""}~${dateTo || ""}` });
  };

  const handleSwitchQuota = (q: QuotaKey) => {
    setQuota(q);
    setRows([]);
    if (hasSearched) fetchRows(q, appliedFrom, appliedTo);
  };

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo("");
    setAppliedSearch(""); setAppliedFrom(""); setAppliedTo("");
    setHasSearched(false);
    setRows([]);
  };

  // Pre-fill "from" with the 1st of the current month, but do NOT auto-fetch —
  // data only loads once the user presses "ສະແດງຂໍ້ມູນ".
  useEffect(() => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    setDateFrom(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!hasSearched) return [];
    const q = appliedSearch.toLowerCase();
    return rows.filter(r => {
      if (q && !(
        String(r.DRAW_ID ?? "").includes(q) ||
        (r.DRAW_DATE ?? "").toLowerCase().includes(q)
      )) return false;
      return true;
    }).sort((a, b) => Number(a.DRAW_ID) - Number(b.DRAW_ID));
  }, [rows, appliedSearch, hasSearched]);

  const grandTotal = useMemo(() => sumCols(filtered), [filtered]);

  const summaryBlock = useMemo(() => {
    const totalReward     = grandTotal.TOTAL_REWARD;
    const taxReward       = grandTotal.TAX_REWARD;
    const rewardAfterTax  = grandTotal.REWARD_AFTER_TAX;
    const bonus           = grandTotal.TOTAL_BONUS;
    return {
      totalReward, taxReward, rewardAfterTax, bonus,
      totalPaidBcel: rewardAfterTax + bonus,
    };
  }, [grandTotal]);

  const hasFilter = search || dateFrom || dateTo;

  const filterSummary = [
    appliedFrom   && `ວັນທີງວດ ຈາກ: ${appliedFrom}`,
    appliedTo     && `ຫາ: ${appliedTo}`,
    appliedSearch && `ຄົ້ນຫາ: "${appliedSearch}"`,
    `Quota: ${quota === "SCN" ? "SCN" : "Sokxay"}`,
  ].filter(Boolean).join("  |  ");

  const handlePrint = () => {
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "reward_print", detail: `Quota ${quota} (${filtered.length} ງວດ)` });
    window.print();
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const [scnRows, sokxayRows] = await Promise.all([
        fetchScnRewardQuota("SCN", appliedFrom, appliedTo),
        fetchScnRewardQuota("SOKXAY", appliedFrom, appliedTo),
      ]);
      const ref = appliedFrom ? new Date(appliedFrom) : new Date();
      const monthLabel = `${String(ref.getMonth() + 1).padStart(2, "0")}/${ref.getFullYear()}`;
      await exportScnRewardQuota(scnRows as QuotaRewardRow[], sokxayRows as QuotaRewardRow[], monthLabel);
      if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "scn_reward_quota_export", detail: `Quota SCN+Sokxay ${appliedFrom || ""}~${appliedTo || ""}` });
    } catch (e: unknown) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const PRINT_CSS = `
    @media print {
      @page { size: A4 landscape; margin: 10mm 10mm 20mm 10mm; }
      @page {
        @bottom-center {
          content: "ໜ້າ " counter(page) " / " counter(pages);
          font-size: 9px;
          font-family: 'Phetsarath OT', 'Phetsarath', sans-serif;
          color: #000;
        }
      }
      html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area { position: absolute; top: 0; left: 0; width: 100%; overflow: visible; padding: 0; box-sizing: border-box; }
      .no-print { display: none !important; }
      * {
        font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important;
        color: #000 !important;
        box-shadow: none !important;
        text-shadow: none !important;
        border-radius: 0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-area div {
        border-radius: 0 !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: none !important;
        background: #fff !important;
        background-color: #fff !important;
      }
      table {
        font-size: 9px !important;
        width: 100% !important;
        border-collapse: collapse !important;
        border: 1px solid #000 !important;
        box-shadow: none !important;
        background: #fff !important;
      }
      th, td {
        padding: 2px 3px !important;
        font-size: 9px !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        border: 1px solid #000 !important;
        color: #000 !important;
        background: #fff !important;
        background-color: #fff !important;
        box-shadow: none !important;
      }
      thead tr th, thead th {
        background: #d0d0d0 !important;
        background-color: #d0d0d0 !important;
        color: #000 !important;
        font-weight: bold !important;
        border: 1px solid #000 !important;
      }
      td.font-mono, td[class*="font-mono"] {
        font-size: 10px !important;
        font-family: 'Arial Narrow', Arial, sans-serif !important;
      }
      tbody tr.grandtotal-row td {
        background: #a0a0a0 !important;
        background-color: #a0a0a0 !important;
        font-weight: bold !important;
        border: 1px solid #000 !important;
      }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
      .overflow-x-auto { overflow: visible !important; }
      .print-area img {
        display: block !important;
        visibility: visible !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-signature {
        display: flex !important;
        justify-content: space-around;
        margin-top: 20mm;
        page-break-inside: avoid;
      }
      .print-signature .sig-box { text-align: center; width: 180px; }
      .print-signature .sig-line { border-top: 1px solid #000 !important; margin-top: 15mm; padding-top: 4px; font-size: 10px; }
      .print-signature .sig-role { font-size: 9px; margin-top: 2px; }
    }
  `;

  const TH = "px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-yellow-100 border border-black text-[10px]";
  const theme = THEME[quota];

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center`}>
              <Layers size={18} className={theme.iconText} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານ ຈ່າຍລາງວັນ Quota SCN / Sokxay ຜ່ານ BCEL - ຕາມງວດ</h1>
              <p className="text-xs text-slate-400">SCN_PORTAL_DATA — QUOTA = SCN / LIKE %XAY%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchRows(quota, appliedFrom, appliedTo)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black text-slate-600 hover:bg-slate-50 transition">
              <RefreshCw size={13} className={loadingRows ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
            </button>
            <button onClick={handleExportExcel} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
              {exporting
                ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງ Export...</>
                : <><FileSpreadsheet size={13} /> Export Excel</>}
            </button>
            {perm("issue_print") && (
              <button onClick={handlePrint} disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            )}
          </div>
        </div>

        {/* Quota switch tabs */}
        <div className="no-print flex items-center gap-2">
          {QUOTA_TABS.map(t => (
            <button key={t.key} onClick={() => handleSwitchQuota(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition ${
                quota === t.key ? THEME[t.key].tabActive : THEME[t.key].tabInactive
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className={`no-print ${theme.filterBg} border ${theme.filterBorder} rounded-xl p-4 flex flex-wrap items-end gap-3`}>
          <div className={`flex items-center gap-1.5 ${theme.filterLabel} font-semibold text-sm w-full mb-1`}>
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີງວດ ຈາກ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={`px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 ${theme.ring} bg-white w-40`} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີງວດ ຫາ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={`px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 ${theme.ring} bg-white w-40`} />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                placeholder="ງວດ, ວັນທີ..."
                className={`w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 ${theme.ring} bg-white`} />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button onClick={handleApplyFilter} disabled={loadingRows}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">
              {loadingRows
                ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງ
              </button>
            )}
            <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
              {loadingRows ? "ກໍາລັງດຶງ..." : hasSearched ? `${filtered.length.toLocaleString()} ງວດ` : ""}
            </span>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-2">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sokxay.png" alt="Company Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
            <p style={{ fontSize: "9px", color: "#888", margin: "2px 0 0 2px", whiteSpace: "nowrap" }}>
              ພິມວັນທີ: {new Date().toLocaleString("lo-LA")}
            </p>
            {user?.displayName && (
              <p style={{ fontSize: "9px", color: "#888", margin: "1px 0 0 2px", whiteSpace: "nowrap" }}>
                ຜູ້ພິມ: {user.displayName}
              </p>
            )}
          </div>
        </div>

        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>
            ສະຫລຸບການຈ່າຍລາງວັນຫວຍ Quota {quota === "SCN" ? "SCN" : "SOKXAY"} ຜ່ານ BCEL
          </h1>
          {filterSummary && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ຕົວກອງ: {filterSummary}
            </div>
          )}
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

        {/* Table */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loadingRows ? (
            <PageSkeleton variant="flat" cols={9} rows={12} />
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <Search size={36} className="opacity-30" />
              <p className="text-sm">ເລືອກຊ່ວງວັນທີແລ້ວກົດ <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th rowSpan={2} className={TH}>ງວດ</th>
                    <th rowSpan={2} className={TH}>ວັນທີ</th>
                    {MAIN_COLS.map(([key, label]) => (
                      <th key={key} rowSpan={2} className={TH}>{label}</th>
                    ))}
                    <th colSpan={PROMO_COLS.length} className={TH}>ລາງວັນໂປຣໂມຊັ່ນ</th>
                  </tr>
                  <tr className="bg-yellow-50">
                    {PROMO_COLS.map(([key, label]) => (
                      <th key={key} className={`${TH} bg-yellow-50`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={2 + ALL_COLS.length} className="text-center py-16 text-slate-400">
                      <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-30" />
                      <p>{rows.length > 0 ? `ບໍ່ມີຂໍ້ມູນທີ່ຕົງກັບ "${appliedSearch}"` : "ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ"}</p>
                    </td></tr>
                  ) : (
                    <>
                      {filtered.map((r, i) => (
                        <tr key={`${r.DRAW_ID}-${i}`} className={theme.rowHover}>
                          <td className={`px-2 py-1.5 text-center font-mono ${theme.drawText} font-semibold border border-black`}>{r.DRAW_ID}</td>
                          <td className="px-2 py-1.5 text-center border border-black">{fmtDate(r.DRAW_DATE)}</td>
                          {ALL_COLS.map(([key]) => (
                            <td key={key} className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r[key])}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="grandtotal-row bg-gray-400 font-bold text-sm">
                        <td className="px-2 py-2 border border-black" colSpan={2}>Total</td>
                        {ALL_COLS.map(([key]) => (
                          <td key={key} className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal[key])}</td>
                        ))}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ສະຫລຸບລາງວັນ (matches bottom summary block in the source Excel) */}
        {hasSearched && filtered.length > 0 && (
          <div className="bg-white border border-black rounded-xl p-4 max-w-md">
            <p className="text-sm font-semibold text-slate-700 mb-2">ສະຫລຸບລາງວັນ ({quota === "SCN" ? "SCN" : "Sokxay"}):</p>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-1 text-slate-600">ລວມລາງວັນ</td><td className="py-1 text-right font-mono">{fmt(summaryBlock.totalReward)}</td></tr>
                <tr><td className="py-1 text-slate-600">ອາກອນລາງວັນ 5%</td><td className="py-1 text-right font-mono text-red-600">{fmt(summaryBlock.taxReward)}</td></tr>
                <tr><td className="py-1 text-slate-600">ຈ່າຍລາງວັນຫລັງຫັກອາກອນ 5%</td><td className="py-1 text-right font-mono">{fmt(summaryBlock.rewardAfterTax)}</td></tr>
                <tr><td className="py-1 text-slate-600">ລາງວັນ ໂປຣໂມຊັ່ນ/Bonus</td><td className="py-1 text-right font-mono">{fmt(summaryBlock.bonus)}</td></tr>
                <tr className="border-t border-slate-200 font-bold"><td className="py-1.5 text-slate-800">ລວມຍອດຈ່າຍລາງວັນຜ່ານ BCEL</td><td className="py-1.5 text-right font-mono">{fmt(summaryBlock.totalPaidBcel)}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Signature */}
        {hasSearched && filtered.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box"><div className="sig-line">ຮອງປະທານກຸ່ມ</div><div className="sig-role"></div></div>
            <div className="sig-box"><div className="sig-line">ຫົວໜ້າບັນຊີ-ການເງິນ</div><div className="sig-role"></div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ສະຫລຸບ</div><div className="sig-role"></div></div>
          </div>
        )}

        {hasSearched && filtered.length === 0 && rows.length === 0 && !rowsError && (
          <div className="no-print flex items-center gap-2 text-xs text-slate-400 px-1">
            <Gift size={12} /> ບໍ່ພົບຂໍ້ມູນ Quota {quota} ໃນຊ່ວງທີ່ເລືອກ
          </div>
        )}
      </div>
    </>
  );
}

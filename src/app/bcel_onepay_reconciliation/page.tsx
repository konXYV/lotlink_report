"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  Search,
  AlertCircle,
  GitCompareArrows,
  Printer,
  X,
  Filter,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { exportBcelOnepayRecon } from "@/lib/ExportBcelOnepayRecon";

// ─── Print CSS ────────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 8mm 6mm 16mm 6mm; }

    @page {
      @bottom-center {
        content: "ໜ້າ " counter(page) " / " counter(pages);
        font-size: 8px;
        font-family: 'Phetsarath OT', 'Phetsarath', sans-serif;
        color: #000;
      }
    }

    html, body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 100%;
      margin: 0;
      padding: 0;
    }

    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }

    .print-area {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 277mm;
      overflow: visible;
      padding: 0;
      box-sizing: border-box;
    }

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

    /* Arial Narrow ສໍາລັບ td ຕົວເລກ — ຕ້ອງຢູ່ຫຼັງ * rule */
    td.num {
      font-family: 'Arial Narrow', Arial, sans-serif !important;
      font-stretch: condensed !important;
    }

    .print-area > div {
      border-radius: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
      background-color: #fff !important;
    }

    .overflow-x-auto {
      overflow: visible !important;
      width: 277mm !important;
    }

    table {
      font-size: 8px !important;
      width: 277mm !important;
      max-width: 277mm !important;
      table-layout: auto !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      box-shadow: none !important;
      background: #fff !important;
    }

    th, td {
      padding: 2px 3px !important;
      font-size: 8px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border: 1px solid #000 !important;
      color: #000 !important;
      background: #fff !important;
      background-color: #fff !important;
      box-shadow: none !important;
    }

    /* ── Reset ສີພື້ນຫຼັງທຸກແຖວ/cell ໃຫ້ເປັນສີຂາວ (ລຶບ hover / diff colors) ── */
    tbody tr td,
    tbody tr.bg-amber-50 td,
    tbody tr.bg-amber-100 td,
    tbody tr.hover\\:bg-amber-100 td,
    tbody tr.hover\\:bg-blue-50 td {
      background: #fff !important;
      background-color: #fff !important;
    }

    /* Limit column widths so table fits within A4 landscape 277mm */
    td:nth-child(1), th:nth-child(1) { max-width: 10mm; } /* ລຳດັບ */
    td:nth-child(2), th:nth-child(2) { max-width: 18mm; } /* ວັນທີ */
    td:nth-child(3), th:nth-child(3) { max-width: 16mm; } /* ງວດ */
    td:nth-child(4), th:nth-child(4) { max-width: 22mm; } /* ຍອດຂາຍໃບລະບົບ A */
    td:nth-child(5), th:nth-child(5) { max-width: 20mm; } /* ຊຳລະຜ່ານຄະແນນ B */
    td:nth-child(6), th:nth-child(6) { max-width: 22mm; } /* ຊຳລະຜ່ານ OnePay C */
    td:nth-child(7), th:nth-child(7) { max-width: 20mm; } /* ຄ່າທຳນຽມ 1.35% D */
    td:nth-child(8), th:nth-child(8) { max-width: 22mm; } /* ຍອດຫຼັງຫັກຄ່າທຳນຽມ E */
    td:nth-child(9), th:nth-child(9) { max-width: 24mm; } /* ຍອດເງິນເຂົ້າ ບ/ຊ ຕົວຈິງ F */
    td:nth-child(10),th:nth-child(10){ max-width: 20mm; } /* ສ່ວນຕ່າງ G */
    td:nth-child(11),th:nth-child(11){ max-width: 30mm; } /* ໝາຍເຫດ */

    thead tr th,
    thead th {
      background: #9DC3E6 !important;
      background-color: #9DC3E6 !important;
      font-weight: bold !important;
      text-align: center !important;
      color: #000 !important;
    }
    tr.total-row td {
      background: #d0d0d0 !important;
      background-color: #d0d0d0 !important;
      font-weight: bold !important;
      font-size: 9px !important;
      padding: 3px 3px !important;
    }
    tr.grand-row td {
      background: #BDD7EE !important;
      background-color: #BDD7EE !important;
      font-weight: bold !important;
      border: 2px solid #000 !important;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }

    .print-signature {
      display: flex !important;
      justify-content: space-around;
      margin-top: 14mm;
      page-break-inside: avoid;
    }
    .print-signature .sig-box { text-align: center; width: 160px; }
    .print-signature .sig-line {
      border-top: 1px solid #000 !important;
      margin-top: 12mm;
      padding-top: 4px;
      font-size: 9px;
    }
    .print-signature .sig-role { font-size: 8px; margin-top: 2px; }
  }
`;

// ─── Row type (matches SQL columns) ──────────────────────────────────────────
export interface BcelOnepayReconRow {
  DRAW_DATE: string | null;
  DRAW_ID: string;
  TOTALSALE: string;
  PAY_ONE: string;
  POINT_SALE: string;
  REAL_STMT: string;
  DISCUSPOINT: string;
  ONEPOINTTHREEPERCENT: string;
  DISCUSPERCENT: string;
  DIFF: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isGrandTotal = (row: BcelOnepayReconRow) =>
  row.DRAW_DATE == null || row.DRAW_DATE === "";

const parseN = (v: string | number | null | undefined): number => {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const neg = s.startsWith("-");
  const n = parseFloat(s.replace(/,/g, "").replace(/^-/, "")) || 0;
  return neg ? -n : n;
};

const fmtVal = (v: string | number | null | undefined): string => {
  if (v == null || v === "") return "";
  const n = parseN(v);
  if (n === 0) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Format DRAW_DATE: DB may return "02/01/2026" (string) or "2.00" (numeric day only)
const fmtDate = (v: string | null | undefined): string => {
  if (v == null || v === "") return "—";
  const s = String(v).trim();
  // Already a proper date string (contains / or -)
  if (/[\/\-]/.test(s)) return s;
  // Numeric — strip decimal part
  const num = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(num)) {
    // Return zero-padded day (month/year unknown from DB — show day only)
    return String(Math.round(num)).padStart(2, "0");
  }
  return s;
};

// Format DRAW_ID: DB returns "26001.00" → "26001"
const fmtDrawId = (v: string | null | undefined): string => {
  if (v == null || v === "") return "—";
  const s = String(v).trim();
  const num = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(num)) return String(Math.round(num));
  return s;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function BcelOnepayReconByDrawPage() {
  const { user } = useAuth();

  const [filterMode, setFilterMode] = useState<"draw" | "date">("draw");

  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo, setDrawTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [rows, setRows] = useState<BcelOnepayReconRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");

  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedMode, setAppliedMode] = useState<"draw" | "date">("draw");

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async (mode: "draw" | "date", from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ view: "bcel_onepay_recon_by_draw" });
      if (mode === "draw") {
        if (from) qs.set("draw_from", from);
        if (to) qs.set("draw_to", to);
      } else {
        if (from) qs.set("date_from", from);
        if (to) qs.set("date_to", to);
      }
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const from = filterMode === "draw" ? drawFrom : dateFrom;
    const to = filterMode === "draw" ? drawTo : dateTo;
    setAppliedFrom(from);
    setAppliedTo(to);
    setAppliedMode(filterMode);
    setHasSearched(true);
    fetchData(filterMode, from, to);
  };

  const handleClear = () => {
    setDrawFrom("");
    setDrawTo("");
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setAppliedMode("draw");
    setHasSearched(false);
    setRows([]);
    setError(null);
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBcelOnepayRecon(rows, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const dataRows = useMemo(() => rows.filter((r) => !isGrandTotal(r)), [rows]);
  const totalRow = useMemo(() => rows.find((r) => isGrandTotal(r)), [rows]);
  const hasData = hasSearched && dataRows.length > 0;
  const hasFilter = drawFrom || drawTo || dateFrom || dateTo;

  // Compute totals for columns SQL may not aggregate (REAL_STMT, DIFF)
  const computedTotals = useMemo(
    () => ({
      realStmt: dataRows.reduce((s, r) => s + parseN(r.REAL_STMT), 0),
      diff: dataRows.reduce((s, r) => s + parseN(r.DIFF), 0),
    }),
    [dataRows],
  );

  // Summary stats
  const stats = useMemo(() => {
    if (!totalRow) return null;
    return {
      totalsale: parseN(totalRow.TOTALSALE),
      payOne: parseN(totalRow.PAY_ONE),
      diff: computedTotals.diff,
    };
  }, [totalRow, computedTotals]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ── Style constants ────────────────────────────────────────────────────────
  const TH =
    "px-2 py-2 text-center font-bold text-slate-700 bg-blue-100 border border-black text-[10px] whitespace-nowrap";
  const TD =
    "px-2 py-1.5 text-right num border border-black text-[10px] whitespace-nowrap";
  const TDC =
    "px-2 py-1.5 text-center num border border-black text-[10px] whitespace-nowrap";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">
        {/* ── Screen Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <GitCompareArrows size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ BCEL
                ປະຈຳເດືອນ
              </h1>
              <p className="text-xs text-slate-400">
                Reconciliation · BCEL_ONEPAY_TXN_SX × BCEL_STMT · ຈຳແນກຕາມງວດ
                (DRAW_ID)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                >
                  {exporting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> ກຳລັງ
                      Export...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet size={13} /> Export Excel
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
                >
                  <Printer size={13} /> ພິມ A4
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Filter ─────────────────────────────────────────────────────────── */}
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          {/* Header + mode toggle */}
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm">
              <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
            </div>
            <div className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg p-0.5">
              <button
                onClick={() => setFilterMode("draw")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  filterMode === "draw"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-emerald-700"
                }`}
              >
                ຕາມງວດ (DRAW_ID)
              </button>
              <button
                onClick={() => setFilterMode("date")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  filterMode === "date"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-emerald-700"
                }`}
              >
                ຕາມວັນທີ
              </button>
            </div>
          </div>

          {/* Draw ID inputs */}
          {filterMode === "draw" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ງວດ ຈາກ
                </label>
                <input
                  type="number"
                  placeholder="ເຊັ່ນ: 26001"
                  value={drawFrom}
                  onChange={(e) => setDrawFrom(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-36"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ງວດ ຫາ
                </label>
                <input
                  type="number"
                  placeholder="ເຊັ່ນ: 26012"
                  value={drawTo}
                  onChange={(e) => setDrawTo(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-36"
                />
              </div>
            </>
          )}

          {/* Date inputs */}
          {filterMode === "date" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ວັນທີ ຈາກ
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onInput={(e) =>
                    setDateFrom((e.target as HTMLInputElement).value)
                  }
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ວັນທີ ຫາ
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onInput={(e) =>
                    setDateTo((e.target as HTMLInputElement).value)
                  }
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...
                </>
              ) : (
                <>
                  <Search size={13} /> ສະແດງຂໍ້ມູນ
                </>
              )}
            </button>
            {(hasFilter || hasSearched) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <X size={12} /> ລ້າງ
              </button>
            )}
            {hasSearched && (
              <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
                {loading
                  ? "ກໍາລັງດຶງ..."
                  : `${dataRows.length.toLocaleString()} ${appliedMode === "date" ? "ວັນ" : "ງວດ"}`}
              </span>
            )}
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        {hasData && stats && (
          <div className="no-print grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-500 font-medium">
                  ລວມຍອດຂາຍທັງໝົດ
                </p>
                <p className="text-sm font-bold text-blue-700 font-mono">
                  {fmt(stats.totalsale)}
                </p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingDown size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-500 font-medium">
                  ລວມຈ່າຍ OnePay
                </p>
                <p className="text-sm font-bold text-emerald-700 font-mono">
                  {fmt(stats.payOne)}
                </p>
              </div>
            </div>
            <div
              className={`border rounded-xl p-3 flex items-center gap-3 ${
                Math.abs(stats.diff) < 0.01
                  ? "bg-slate-50 border-slate-200"
                  : "bg-amber-50 border-amber-300"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  Math.abs(stats.diff) < 0.01 ? "bg-slate-100" : "bg-amber-100"
                }`}
              >
                <GitCompareArrows
                  size={16}
                  className={
                    Math.abs(stats.diff) < 0.01
                      ? "text-slate-500"
                      : "text-amber-600"
                  }
                />
              </div>
              <div>
                <p
                  className={`text-xs font-medium ${Math.abs(stats.diff) < 0.01 ? "text-slate-500" : "text-amber-600"}`}
                >
                  ສ່ວນຕ່າງ (DIFF)
                </p>
                <p
                  className={`text-sm font-bold font-mono ${Math.abs(stats.diff) < 0.01 ? "text-slate-700" : "text-amber-700"}`}
                >
                  {fmt(stats.diff)}
                  {Math.abs(stats.diff) < 0.01 && (
                    <span
                      className="ml-1 text-xs text-emerald-600"
                      style={{
                        fontFamily: "'Noto Sans Lao', 'Inter', sans-serif",
                        fontWeight: "normal",
                      }}
                    >
                      ✓ ສົມດູນ
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ──────────────────────────────────────────────────────────── */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print header ────────────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sokxay.png"
              alt="Logo"
              style={{ height: "44px", width: "auto", objectFit: "contain" }}
            />
            <p
              style={{ fontSize: "8px", color: "#888", margin: "2px 0 0 2px" }}
            >
              ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            </p>
            {user?.displayName && (
              <p
                style={{
                  fontSize: "9px",
                  color: "#888",
                  margin: "1px 0 0 2px",
                  whiteSpace: "nowrap",
                }}
              >
                ຜູ້ພິມ: {user.displayName}
              </p>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: "4px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>
              ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
            </div>
            <div style={{ fontSize: "10px" }}>
              ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ
            </div>
            <h1
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                margin: "4px 0 0 0",
              }}
            >
              ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ BCEL (ບັນຊີ
              OnePay) — 0901300002155
            </h1>
            {(appliedFrom || appliedTo) && (
              <div
                style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}
              >
                {appliedMode === "date" ? "ວັນທີ" : "ງວດ"}: {appliedFrom || "—"}{" "}
                ຫາ {appliedTo || "—"}
              </div>
            )}
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <GitCompareArrows size={36} className="opacity-30" />
              <p className="text-sm">
                ລະບຸໝາຍເລກງວດ ແລ້ວກົດ{" "}
                <span className="font-semibold text-emerald-600">
                  ສະແດງຂໍ້ມູນ
                </span>
              </p>
            </div>
          ) : dataRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <GitCompareArrows size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງງວດທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  {/* Row 1: Group headers */}
                  <tr>
                    <th className={TH} rowSpan={2}>
                      ລຳດັບ
                    </th>
                    <th className={TH} rowSpan={2}>
                      ວັນທີ
                    </th>
                    <th className={TH} rowSpan={2}>
                      ງວດ
                    </th>
                    <th className={TH + " bg-blue-200"} colSpan={2}>
                      ຍອດຂາຍຊຳລະຜ່ານ BCEL
                    </th>
                    <th className={TH} rowSpan={2}>
                      ຊຳລະຜ່ານ
                      <br />
                      OnePay
                      <br />
                      <span className="font-normal text-[9px]">C=A-B</span>
                    </th>
                    <th className={TH} rowSpan={2}>
                      ຄ່າທຳນຽມ
                      <br />
                      1.35%
                      <br />
                      <span className="font-normal text-[9px]">D=C*1.35%</span>
                    </th>
                    <th className={TH} rowSpan={2}>
                      ຍອດເງິນຫຼັງຫັກ
                      <br />
                      ຄ່າທຳນຽມ
                      <br />
                      <span className="font-normal text-[9px]">E=C-D</span>
                    </th>
                    <th className={TH + " bg-red-100"} rowSpan={2}>
                      ຍອດເງິນ
                      <br />
                      ເຂົ້າ ບ/ຊ ຕົວຈິງ
                      <br />
                      0901300002155
                    </th>
                    <th className={TH} rowSpan={2}>
                      ສ່ວນຕ່າງ
                      <br />
                      <span className="font-normal text-[9px]">G=F-E</span>
                    </th>
                    <th className={TH + " bg-yellow-100"} rowSpan={2}>
                      ໝາຍເຫດ
                    </th>
                  </tr>
                  <tr>
                    <th className={TH + " bg-blue-200"}>
                      ຍອດຂາຍໃບລະບົບ
                      <br />
                      <span className="font-normal text-[9px] italic">A</span>
                    </th>
                    <th className={TH + " bg-blue-200"}>
                      ຊຳລະຜ່ານ
                      <br />
                      ຄະແນນ
                      <br />
                      <span className="font-normal text-[9px] italic">B</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, i) => {
                    const diffVal = parseN(row.DIFF);
                    const hasDiff = Math.abs(diffVal) >= 0.01;
                    return (
                      <tr
                        key={i}
                        className={
                          hasDiff
                            ? "bg-amber-50 hover:bg-amber-100"
                            : "hover:bg-blue-50"
                        }
                      >
                        <td className={TDC}>{i + 1}</td>
                        <td className={TDC}>{fmtDate(row.DRAW_DATE)}</td>
                        <td className={TDC + " font-semibold"}>
                          {fmtDrawId(row.DRAW_ID)}
                        </td>
                        <td className={TD + " text-blue-800"}>
                          {fmtVal(row.TOTALSALE)}
                        </td>
                        <td className={TD}>{fmtVal(row.POINT_SALE)}</td>
                        <td className={TD + " font-medium"}>
                          {fmtVal(row.PAY_ONE)}
                        </td>
                        <td className={TD}>
                          {fmtVal(row.ONEPOINTTHREEPERCENT)}
                        </td>
                        <td className={TD}>{fmtVal(row.DISCUSPERCENT)}</td>
                        <td className={TD + " text-red-700 font-medium"}>
                          {fmtVal(row.REAL_STMT)}
                        </td>
                        <td
                          className={
                            TD + (hasDiff ? " text-amber-700 font-bold" : "")
                          }
                        >
                          {fmtVal(row.DIFF)}
                        </td>
                        <td className="px-2 py-1.5 text-left border border-black text-[10px]"></td>
                      </tr>
                    );
                  })}

                  {/* Total row */}
                  {totalRow && (
                    <tr className="total-row bg-gray-200 font-bold">
                      <td
                        className={TDC + " bg-gray-200 font-bold"}
                        colSpan={3}
                        style={{
                          fontFamily:
                            "'Noto Sans Lao', 'Phetsarath OT', sans-serif",
                        }}
                      >
                        ລວມທັງໝົດ
                      </td>
                      <td
                        className={TD + " bg-gray-200 font-bold text-blue-800"}
                      >
                        {fmtVal(totalRow.TOTALSALE)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmtVal(totalRow.POINT_SALE)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmtVal(totalRow.PAY_ONE)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmtVal(totalRow.ONEPOINTTHREEPERCENT)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmtVal(totalRow.DISCUSPERCENT)}
                      </td>
                      <td
                        className={TD + " bg-gray-200 font-bold text-red-700"}
                      >
                        {fmtVal(
                          parseN(totalRow.REAL_STMT) !== 0
                            ? totalRow.REAL_STMT
                            : computedTotals.realStmt,
                        )}
                      </td>
                      <td
                        className={
                          TD +
                          " bg-gray-200 font-bold" +
                          (Math.abs(computedTotals.diff) >= 0.01
                            ? " text-amber-700"
                            : " text-emerald-700")
                        }
                      >
                        {fmtVal(
                          computedTotals.diff !== 0
                            ? computedTotals.diff
                            : totalRow.DIFF,
                        )}
                      </td>
                      <td className="px-2 py-1.5 border border-black bg-gray-200"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer note (screen) ─────────────────────────────────────────── */}
        {hasData && (
          <div className="no-print text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="font-semibold text-slate-600">ໝາຍເຫດ:</span>{" "}
            ຍອດຂາຍໃນຕາຕະລາງນີ້ມາຈາກ{" "}
            <code className="bg-slate-200 px-1 rounded">
              BCEL_ONEPAY_TXN_SX
            </code>{" "}
            ×{" "}
            <code className="bg-slate-200 px-1 rounded">
              BCEL_STMT (BCEL_ECOM_SokxayPLUS_SETTLE)
            </code>{" "}
            · ຄ່າທຳນຸງ 1.35% ຄຳນວນດ້ວຍ round half-to-even
          </div>
        )}

        {/* ── Signature (print only) ────────────────────────────────────────── */}
        {hasData && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສ້າງ</div>
              <div className="sig-role">
                ( .............................................. )
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ກວດສອບ</div>
              <div className="sig-role">
                ( .............................................. )
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ອະນຸມັດ</div>
              <div className="sig-role">
                ( .............................................. )
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

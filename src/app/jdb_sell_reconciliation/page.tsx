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
import { exportJdbSellRecon } from "@/lib/ExportJdbSellRecon";

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
      width: 100%; margin: 0; padding: 0;
    }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area {
      position: absolute; top: 0; left: 50%;
      transform: translateX(-50%);
      width: 277mm; overflow: visible; padding: 0; box-sizing: border-box;
    }
    .no-print { display: none !important; }
    * {
      font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important;
      color: #000 !important;
      box-shadow: none !important; text-shadow: none !important;
      border-radius: 0 !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    td.num {
      font-family: 'Arial Narrow', Arial, sans-serif !important;
      font-stretch: condensed !important;
    }
    .print-area > div {
      border-radius: 0 !important; overflow: visible !important;
      box-shadow: none !important; border: none !important;
      background: #fff !important; background-color: #fff !important;
    }
    .overflow-x-auto { overflow: visible !important; width: 277mm !important; }

    table {
      font-size: 7.5px !important; width: 277mm !important;
      max-width: 277mm !important; table-layout: auto !important;
      border-collapse: collapse !important; border: 1px solid #000 !important;
      box-shadow: none !important; background: #fff !important;
    }
    th, td {
      padding: 2px 3px !important; font-size: 7.5px !important;
      white-space: nowrap !important; overflow: hidden !important;
      text-overflow: ellipsis !important; border: 1px solid #000 !important;
      color: #000 !important; background: #fff !important;
      background-color: #fff !important; box-shadow: none !important;
    }
    tbody tr td,
    tbody tr.bg-amber-50 td, tbody tr.bg-amber-100 td,
    tbody tr.hover\\:bg-amber-100 td, tbody tr.hover\\:bg-blue-50 td {
      background: #fff !important; background-color: #fff !important;
    }

    /* Column widths — 12 cols, A4 landscape 277mm */
    td:nth-child(1),  th:nth-child(1)  { max-width:  8mm; } /* ລຳດັບ */
    td:nth-child(2),  th:nth-child(2)  { max-width: 16mm; } /* ວັນທີ */
    td:nth-child(3),  th:nth-child(3)  { max-width: 13mm; } /* ງວດ */
    td:nth-child(4),  th:nth-child(4)  { max-width: 26mm; } /* A */
    td:nth-child(5),  th:nth-child(5)  { max-width: 22mm; } /* B */
    td:nth-child(6),  th:nth-child(6)  { max-width: 18mm; } /* C */
    td:nth-child(7),  th:nth-child(7)  { max-width: 24mm; } /* D */
    td:nth-child(8),  th:nth-child(8)  { max-width: 20mm; } /* E */
    td:nth-child(9),  th:nth-child(9)  { max-width: 22mm; } /* F */
    td:nth-child(10), th:nth-child(10) { max-width: 24mm; } /* G */
    td:nth-child(11), th:nth-child(11) { max-width: 20mm; } /* I */
    td:nth-child(12), th:nth-child(12) { max-width: 26mm; } /* ໝາຍເຫດ */

    thead tr th, thead th {
      background: #9DC3E6 !important; background-color: #9DC3E6 !important;
      font-weight: bold !important; text-align: center !important; color: #000 !important;
    }
    /* ຖັນ ລາຍການຫັກ (B, C) */
    thead th.col-deduct {
      background: #FCE4D6 !important; background-color: #FCE4D6 !important;
    }
    /* ຖັນ A ຍອດຂາຍ */
    thead th.col-sale {
      background: #DDEEFF !important; background-color: #DDEEFF !important;
    }
    /* ຖັນ G REAL_STMT */
    thead th.col-real {
      background: #FFD7D7 !important; background-color: #FFD7D7 !important;
    }
    /* ຖັນ ໝາຍເຫດ */
    thead th.col-remark {
      background: #FFFACD !important; background-color: #FFFACD !important;
    }

    tr.total-row td {
      background: #BDD7EE !important; background-color: #BDD7EE !important;
      font-weight: bold !important; font-size: 8.5px !important; padding: 3px 3px !important;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }

    /* Print title block */
    .print-title { display: block !important; text-align: center; margin-bottom: 4mm; }
    .print-title .t1 { font-size: 11px; }
    .print-title .t2 { font-size: 10px; }
    .print-title .t3 { font-size: 13px; font-weight: bold; }
    .print-title .t4 { font-size: 10px; font-weight: bold; color: #CC0000 !important; }
    .print-title .t5 { font-size: 9px; }

    .print-signature {
      display: flex !important; justify-content: space-around;
      margin-top: 14mm; page-break-inside: avoid;
    }
    .print-signature .sig-box { text-align: center; width: 160px; }
    .print-signature .sig-line {
      border-top: 1px solid #000 !important; margin-top: 12mm;
      padding-top: 4px; font-size: 9px;
    }
    .print-signature .sig-role { font-size: 8px; margin-top: 2px; }
  }
`;

// ─── Row type ─────────────────────────────────────────────────────────────────
export interface JdbSellReconRow {
  DRAWDATE: string | null;
  DRAWID: string;
  A_YODKHAI: string;
  DISCUSPOINT: string;
  REFUND_AMOUNT: string;
  AFTERDISCOUNT: string;
  FEE_ONE_PERCENT: string;
  AFTER_DISCUS_ALL: string;
  REAL_STMT: string;
  DIFF: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isGrandTotal = (row: JdbSellReconRow) =>
  row.DRAWDATE === null || row.DRAWDATE === "";

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
  if (n === 0) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtDate = (v: string | null | undefined): string => {
  if (v == null || v === "") return "—";
  const s = String(v).trim();
  if (/[\/\-]/.test(s)) return s;
  const num = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(num)) return String(Math.round(num)).padStart(2, "0");
  return s;
};

const fmtDrawId = (v: string | null | undefined): string => {
  if (v == null || v === "") return "—";
  const s = String(v).trim();
  const num = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(num)) return String(Math.round(num));
  return s;
};

// Derive "ເດືອນ MM/YYYY" from first data row's DRAWDATE for title/export
const deriveMonth = (rows: JdbSellReconRow[]): string => {
  const first = rows.find((r) => r.DRAWDATE);
  if (!first?.DRAWDATE) return "";
  const s = String(first.DRAWDATE).trim();
  // DD/MM/YYYY format
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[2]}/${m[3]}`;
  return "";
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function JdbSellReconPage() {
  const { user } = useAuth();

  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo, setDrawTo] = useState("");

  const [rows, setRows] = useState<JdbSellReconRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");

  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ view: "jdb_sell_reconciliation" });
      if (from) qs.set("draw_from", from);
      if (to) qs.set("draw_to", to);
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
    setAppliedFrom(drawFrom);
    setAppliedTo(drawTo);
    setHasSearched(true);
    fetchData(drawFrom, drawTo);
  };

  const handleClear = () => {
    setDrawFrom("");
    setDrawTo("");
    setAppliedFrom("");
    setAppliedTo("");
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
      const month = deriveMonth(dataRows);
      await exportJdbSellRecon(
        rows,
        appliedFrom,
        appliedTo,
        user?.email ?? "",
        month,
      );
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const dataRows = useMemo(() => rows.filter((r) => !isGrandTotal(r)), [rows]);
  const hasData = hasSearched && dataRows.length > 0;
  const hasFilter = drawFrom || drawTo;

  const totals = useMemo(
    () => ({
      aYodkhai: dataRows.reduce((s, r) => s + parseN(r.A_YODKHAI), 0),
      discuspoint: dataRows.reduce((s, r) => s + parseN(r.DISCUSPOINT), 0),
      refund: dataRows.reduce((s, r) => s + parseN(r.REFUND_AMOUNT), 0),
      afterDiscount: dataRows.reduce((s, r) => s + parseN(r.AFTERDISCOUNT), 0),
      feeOne: dataRows.reduce((s, r) => s + parseN(r.FEE_ONE_PERCENT), 0),
      afterAll: dataRows.reduce((s, r) => s + parseN(r.AFTER_DISCUS_ALL), 0),
      realStmt: dataRows.reduce((s, r) => s + parseN(r.REAL_STMT), 0),
      diff: dataRows.reduce(
        (s, r) =>
          s +
          parseN(r.REAL_STMT) -
          parseN(r.AFTERDISCOUNT) -
          parseN(r.REFUND_AMOUNT),
        0,
      ),
    }),
    [dataRows],
  );

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ── Styles ─────────────────────────────────────────────────────────────────
  const TH =
    "px-2 py-2 text-center font-bold text-slate-700 border border-black text-[9px] whitespace-nowrap";
  const TD =
    "px-2 py-1.5 text-right num border border-black text-[9px] whitespace-nowrap";
  const TDC =
    "px-2 py-1.5 text-center num border border-black text-[9px] whitespace-nowrap";

  const month = deriveMonth(dataRows);

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">
        {/* ── Print Title Block ─────────────────────────────────────────────── */}
        <div className="print-title hidden text-center">
          <div className="t1">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
          <div className="t2">
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ
          </div>
          <div className="t3">
            ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ JDB
            {month ? ` ປະຈຳເດືອນ ${month}` : ""}
          </div>
          <div className="t4">ບັນຊີ JDB: 02920020000003180</div>
          {(appliedFrom || appliedTo) && (
            <div className="t5">
              ງວດ:{" "}
              {appliedFrom && appliedTo
                ? `${appliedFrom} – ${appliedTo}`
                : appliedFrom
                  ? `ຕັ້ງແຕ່ ${appliedFrom}`
                  : `ຮອດ ${appliedTo}`}
            </div>
          )}
          {printTime && <div className="t5">ພິມວັນທີ: {printTime}</div>}
        </div>

        {/* ── Screen Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <GitCompareArrows size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ລາຍງານສົມທຽບ ຍອດຂາຍຫວຍ ຜ່ານ APP SOKXAY ທີ່ ຊຳລະຜ່ານ JDB
              </h1>
              <p className="text-xs text-slate-400">
                JDB Sell Reconciliation · LOTTERYORDER × JDB_STMT · ຈຳແນກຕາມງວດ
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
        <div className="no-print bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center w-full mb-1">
            <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-sm">
              <Filter size={14} /> ຕົວກອງຂໍ້ມູນ · ງວດ (DRAWID)
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">
              ງວດ ຈາກ
            </label>
            <input
              type="number"
              placeholder="ເຊັ່ນ: 26038"
              value={drawFrom}
              onChange={(e) => setDrawFrom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-36"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດ ຫາ</label>
            <input
              type="number"
              placeholder="ເຊັ່ນ: 26056"
              value={drawTo}
              onChange={(e) => setDrawTo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-36"
            />
          </div>
          <button
            onClick={handleApply}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            {loading ? "ກຳລັງໂຫຼດ..." : "ຄົ້ນຫາ"}
          </button>
          {hasFilter && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
            >
              <X size={13} /> ລ້າງ
            </button>
          )}
        </div>

        {/* ── Applied filter badge ───────────────────────────────────────────── */}
        {hasSearched && (appliedFrom || appliedTo) && (
          <div className="no-print flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
            <Filter size={12} />
            <span>
              ກຳລັງສະແດງ:{" "}
              {appliedFrom && appliedTo
                ? `ງວດ ${appliedFrom} – ${appliedTo}`
                : appliedFrom
                  ? `ຕັ້ງແຕ່ງວດ ${appliedFrom}`
                  : `ຮອດງວດ ${appliedTo}`}
              {month && ` (${month})`}
            </span>
          </div>
        )}

        {/* ── Stats bar ─────────────────────────────────────────────────────── */}
        {hasData && (
          <div className="no-print grid grid-cols-4 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 mb-0.5">
                ຍອດຂາຍໃບລະບົບ (A)
              </div>
              <div className="text-sm font-bold text-blue-700">
                {fmt(totals.aYodkhai)}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 mb-0.5">
                ສ່ວນຫຼຸດ+Refund (B+C)
              </div>
              <div className="text-sm font-bold text-orange-600">
                {fmt(totals.discuspoint + totals.refund)}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 mb-0.5">
                ຍອດ ບ/ຊ ຕົວຈິງ (G)
              </div>
              <div className="text-sm font-bold text-slate-700">
                {fmt(totals.realStmt)}
              </div>
            </div>
            <div
              className={`border rounded-xl p-3 ${
                Math.abs(totals.diff) >= 0.01
                  ? "bg-amber-50 border-amber-300"
                  : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <div className="text-[10px] text-slate-500 mb-0.5 flex items-center gap-1">
                {Math.abs(totals.diff) >= 0.01 ? (
                  <TrendingDown size={11} className="text-amber-600" />
                ) : (
                  <TrendingUp size={11} className="text-emerald-600" />
                )}
                ສ່ວນຕ່າງ (I=G-D-C)
              </div>
              <div
                className={`text-sm font-bold ${
                  Math.abs(totals.diff) >= 0.01
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {fmt(totals.diff)}
              </div>
            </div>
          </div>
        )}

        {/* ── Main card ─────────────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 no-print">
            <span className="text-sm font-semibold text-slate-700">
              ຕາຕະລາງ Reconciliation
            </span>
            {hasData && (
              <span className="text-xs text-slate-400">
                {dataRows.length} ງວດ
              </span>
            )}
          </div>

          {error ? (
            <div className="flex items-center gap-2 p-5 text-sm text-red-600 bg-red-50">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
              <RefreshCw size={16} className="animate-spin" />{" "}
              ກຳລັງໂຫຼດຂໍ້ມູນ...
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <GitCompareArrows size={36} className="opacity-30" />
              <p className="text-sm">ກະລຸນາເລືອກງວດ ແລ້ວກົດ "ຄົ້ນຫາ"</p>
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
                  {/* ── Row 1: group headers ── */}
                  <tr>
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ລຳດັບ
                    </th>
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ວັນທີ
                    </th>
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ງວດ
                    </th>
                    {/* A */}
                    <th className={TH + " col-sale bg-[#DDEEFF]"} rowSpan={2}>
                      ຍອດຂາຍໃບ
                      <br />
                      ລະບົບ
                      <br />
                      <span className="font-normal text-[8px] italic">A</span>
                    </th>
                    {/* ລາຍການຫັກ colspan 2 */}
                    <th
                      className={TH + " col-deduct bg-orange-100"}
                      colSpan={2}
                    >
                      ລາຍການຫັກ
                    </th>
                    {/* D */}
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ຍອດຫຼັງຫັກ
                      <br />
                      ສ່ວນຫຼຸດ ແລະ Refund
                      <br />
                      <span className="font-normal text-[8px]">D=A-B-C</span>
                    </th>
                    {/* E */}
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ຄ່າທຳນຽມ
                      <br />
                      1%
                      <br />
                      <span className="font-normal text-[8px]">E=D*1%</span>
                    </th>
                    {/* F */}
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ຍອດຫຼັງຫັກ
                      <br />
                      ຄ່າທຳນຽມ
                      <br />
                      <span className="font-normal text-[8px]">F=D-E</span>
                    </th>
                    {/* G */}
                    <th className={TH + " col-real bg-red-100"} rowSpan={2}>
                      ຍອດເງິນເຂົ້າ
                      <br />
                      ບ/ຊ ຕົວຈິງ
                      <br />
                      <span className="font-normal text-[8px]">
                        02920020000003180
                      </span>
                    </th>
                    {/* I */}
                    <th className={TH + " bg-blue-100"} rowSpan={2}>
                      ສ່ວນຕ່າງ
                      <br />
                      <span className="font-normal text-[8px]">I=G-D-C</span>
                    </th>
                    {/* ໝາຍເຫດ */}
                    <th className={TH + " col-remark bg-yellow-50"} rowSpan={2}>
                      ໝາຍເຫດ
                    </th>
                  </tr>
                  {/* ── Row 2: sub-labels B, C ── */}
                  <tr>
                    <th className={TH + " col-deduct bg-orange-100"}>
                      ສ່ວນຫຼຸດ
                      <br />
                      <span className="font-normal text-[8px] italic">B</span>
                    </th>
                    <th className={TH + " col-deduct bg-orange-100"}>
                      Refund
                      <br />
                      <span className="font-normal text-[8px] italic">C</span>
                    </th>
                  </tr>
                  {/* ── Row 3: formula label ── */}
                  <tr className="bg-slate-50">
                    {[
                      "",
                      "",
                      "",
                      "A",
                      "B",
                      "C",
                      "D=A-B-C",
                      "E=D×1%",
                      "F=D×99%",
                      "G",
                      "I=G-D-C",
                      "",
                    ].map((lbl, ci) => (
                      <td
                        key={ci}
                        className="px-1 py-0.5 text-center text-[8px] italic text-slate-400 border border-black bg-slate-50"
                      >
                        {lbl}
                      </td>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {dataRows.map((row, i) => {
                    const diffVal =
                      parseN(row.REAL_STMT) -
                      parseN(row.AFTERDISCOUNT) -
                      parseN(row.REFUND_AMOUNT);
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
                        <td className={TDC}>{fmtDate(row.DRAWDATE)}</td>
                        <td className={TDC + " font-semibold text-purple-800"}>
                          {fmtDrawId(row.DRAWID)}
                        </td>
                        <td className={TD + " text-blue-800 bg-[#EEF6FF]"}>
                          {fmtVal(row.A_YODKHAI)}
                        </td>
                        <td className={TD + " text-orange-700 bg-orange-50"}>
                          {fmtVal(row.DISCUSPOINT)}
                        </td>
                        <td className={TD + " text-orange-700 bg-orange-50"}>
                          {fmtVal(row.REFUND_AMOUNT)}
                        </td>
                        <td className={TD}>{fmtVal(row.AFTERDISCOUNT)}</td>
                        <td className={TD}>{fmtVal(row.FEE_ONE_PERCENT)}</td>
                        <td className={TD + " font-medium"}>
                          {fmtVal(row.AFTER_DISCUS_ALL)}
                        </td>
                        <td
                          className={TD + " text-red-700 font-medium bg-red-50"}
                        >
                          {fmtVal(row.REAL_STMT)}
                        </td>
                        <td
                          className={
                            TD +
                            (hasDiff
                              ? " text-amber-700 font-bold"
                              : " text-emerald-700")
                          }
                        >
                          {fmtVal(diffVal)}
                        </td>
                        <td className="px-2 py-1.5 text-left border border-black text-[9px] bg-yellow-50 min-w-[60px]"></td>
                      </tr>
                    );
                  })}

                  {/* ── Total row ── */}
                  {hasData && (
                    <tr className="total-row bg-[#BDD7EE] font-bold">
                      <td
                        className={TDC + " bg-[#BDD7EE] font-bold"}
                        colSpan={3}
                        style={{
                          fontFamily:
                            "'Noto Sans Lao','Phetsarath OT',sans-serif",
                        }}
                      >
                        ລວມຍອດ
                      </td>
                      <td
                        className={TD + " bg-[#BDD7EE] font-bold text-blue-800"}
                      >
                        {fmt(totals.aYodkhai)}
                      </td>
                      <td
                        className={
                          TD + " bg-[#BDD7EE] font-bold text-orange-700"
                        }
                      >
                        {fmt(totals.discuspoint)}
                      </td>
                      <td
                        className={
                          TD + " bg-[#BDD7EE] font-bold text-orange-700"
                        }
                      >
                        {fmt(totals.refund)}
                      </td>
                      <td className={TD + " bg-[#BDD7EE] font-bold"}>
                        {fmt(totals.afterDiscount)}
                      </td>
                      <td className={TD + " bg-[#BDD7EE] font-bold"}>
                        {fmt(totals.feeOne)}
                      </td>
                      <td className={TD + " bg-[#BDD7EE] font-bold"}>
                        {fmt(totals.afterAll)}
                      </td>
                      <td
                        className={TD + " bg-[#BDD7EE] font-bold text-red-700"}
                      >
                        {fmt(totals.realStmt)}
                      </td>
                      <td
                        className={
                          TD +
                          " bg-[#BDD7EE] font-bold" +
                          (Math.abs(totals.diff) >= 0.01
                            ? " text-amber-700"
                            : " text-emerald-700")
                        }
                      >
                        {fmt(totals.diff)}
                      </td>
                      <td className="px-2 py-1.5 border border-black bg-[#BDD7EE]"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer note ───────────────────────────────────────────────────── */}
        {hasData && (
          <div className="no-print text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <span className="font-semibold text-slate-600">ໝາຍເຫດ:</span> ຍອດຂາຍ
            (A) ຈາກ{" "}
            <code className="bg-slate-200 px-1 rounded">LOTTERYORDER</code>{" "}
            (STATUS=&apos;DONE&apos;, PAYBY=&apos;JDB&apos;) · ສ່ວນຫຼຸດ (B) = A
            − TOTAL_BANK_CR · Refund (C) ຈາກ{" "}
            <code className="bg-slate-200 px-1 rounded">
              JDB_STMT (TXN_TYPE=SPLUS_REFUND)
            </code>
            · ສ່ວນຕ່າງ I = G − D − C
          </div>
        )}

        {/* ── Signature (print only) ─────────────────────────────────────────── */}
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

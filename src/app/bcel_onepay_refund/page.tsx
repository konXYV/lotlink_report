"use client";
import { useState, useRef, useCallback } from "react";
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileDown,
  Printer,
  X,
  Filter,
  RotateCcw,
  BarChart3,
  Calendar,
  CalendarDays,
  CalendarRange,
  LayoutList,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";
import {
  exportOnepayRefundByDraw,
  exportOnepayRefundByDrawDate,
  exportOnepayRefundByDate,
  exportOnepayRefundByDateDraw,
  type OnepayRefundByDraw,
  type OnepayRefundByDrawDate,
  type OnepayRefundByDate,
  type OnepayRefundByDateDraw,
} from "@/lib/exportExcelLib";

// ─── Types (imported from exportExcelLib) ─────────────────────────────────────
type RowByDraw = OnepayRefundByDraw;
type RowByDrawDate = OnepayRefundByDrawDate;
type RowByDate = OnepayRefundByDate;
type RowByDateDraw = OnepayRefundByDateDraw;

type ReportType = 1 | 2 | 3 | 4;

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const fmtInt = (n: number) => n.toLocaleString("en-US");

// ─── Report tab config ───────────────────────────────────────────────────────
const REPORTS: {
  id: ReportType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 1,
    icon: <BarChart3 size={15} />,
    label: "ສັງລວມຕາມງວດ",
    desc: "ຈຳນວນ + ຈຳນວນເງິນ refund ຕໍ່ງວດ",
  },
  {
    id: 2,
    icon: <CalendarRange size={15} />,
    label: "ສັງລວມຕາມງວດ + ວັນທີ",
    desc: "ຕໍ່ງວດ ແລະ ລາຍວັນທີທີ່ refund",
  },
  {
    id: 3,
    icon: <Calendar size={15} />,
    label: "ສັງລວມຕາມວັນທີ",
    desc: "ຈຳນວນ + ຈຳນວນເງິນ refund ຕໍ່ວັນທີ",
  },
  {
    id: 4,
    icon: <CalendarDays size={15} />,
    label: "ສັງລວມຕາມວັນທີ + ງວດ",
    desc: "ຕໍ່ວັນທີ ແລະ ລາຍງວດທີ່ refund",
  },
];

const VIEW_KEYS: Record<ReportType, string> = {
  1: "bcel_onepay_refund_by_draw",
  2: "bcel_onepay_refund_by_draw_with_dates",
  3: "bcel_onepay_refund_by_date",
  4: "bcel_onepay_refund_by_date_with_draws",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BcelOnepayRefundPage() {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [reportId, setReportId] = useState<ReportType>(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo, setDrawTo] = useState("");
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [appliedReport, setAppliedReport] = useState<ReportType>(1);
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");
  const [appliedDrawFrom, setAppliedDrawFrom] = useState("");
  const [appliedDrawTo, setAppliedDrawTo] = useState("");

  const fetchData = useCallback(
    async (rid: ReportType, from: string, to: string, dFrom = "", dTo = "") => {
      setLoading(true);
      setError(null);
      try {
        const sp = new URLSearchParams({ view: VIEW_KEYS[rid] });
        if (rid === 1 || rid === 2) {
          if (dFrom) sp.set("draw_from", dFrom);
          if (dTo) sp.set("draw_to", dTo);
        } else {
          if (from) sp.set("date_from", from);
          if (to) sp.set("date_to", to);
        }
        const res = await fetch(`/api/oracle?${sp.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
        setRows(json.rows ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSearch = () => {
    setAppliedReport(reportId);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedDrawFrom(drawFrom);
    setAppliedDrawTo(drawTo);
    setHasSearched(true);
    fetchData(reportId, dateFrom, dateTo, drawFrom, drawTo);
    if (user)
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: "bcel_refund_search",
        detail:
          reportId === 1 || reportId === 2
            ? `OnePay Refund R${reportId} ງວດ ${drawFrom || ""}–${drawTo || ""}`
            : `OnePay Refund R${reportId} ${dateFrom || ""}–${dateTo || ""}`,
      });
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setDrawFrom("");
    setDrawTo("");
    setHasSearched(false);
    setRows([]);
    setError(null);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const fs = filterSummary || undefined;
      if (appliedReport === 1)
        exportOnepayRefundByDraw(rows as RowByDraw[], fs);
      else if (appliedReport === 2)
        exportOnepayRefundByDrawDate(rows as RowByDrawDate[], fs);
      else if (appliedReport === 3)
        exportOnepayRefundByDate(rows as RowByDate[], fs);
      else exportOnepayRefundByDateDraw(rows as RowByDateDraw[], fs);
      if (user)
        logActivity({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          action: "bcel_refund_export",
          detail: `Export OnePay Refund R${appliedReport} ${rows.length} ລາຍການ`,
        });
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
    if (user)
      logActivity({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        action: "bcel_refund_print",
        detail: `ພິມ OnePay Refund R${appliedReport} ${rows.length} ລາຍການ`,
      });
  };

  // ── Totals ──
  const totalTxn = (rows as { TT_TXN: number }[]).reduce(
    (s, r) => s + (r.TT_TXN ?? 0),
    0,
  );
  const totalAmt = (rows as { REFUND_AMT: number }[]).reduce(
    (s, r) => s + (r.REFUND_AMT ?? 0),
    0,
  );

  const filterSummary =
    appliedReport === 1 || appliedReport === 2
      ? [
          appliedDrawFrom && `ງວດເລີ່ມ: ${appliedDrawFrom}`,
          appliedDrawTo && `ງວດສິ້ນສຸດ: ${appliedDrawTo}`,
        ]
          .filter(Boolean)
          .join("  |  ")
      : [
          appliedDateFrom && `ຈາກ: ${appliedDateFrom}`,
          appliedDateTo && `ຫາ: ${appliedDateTo}`,
        ]
          .filter(Boolean)
          .join("  |  ");

  const TH =
    "px-3 py-2.5 text-center font-bold text-slate-700 cursor-pointer select-none whitespace-nowrap bg-blue-100 border border-black text-[11px]";
  const TD = "px-2 py-1.5 border border-black text-[11px]";

  // ── Grouped data for report 2 & 4 ──
  const groupedByDraw = (() => {
    if (appliedReport !== 2) return [];
    const map = new Map<
      string,
      { dates: RowByDrawDate[]; total_txn: number; total_amt: number }
    >();
    (rows as RowByDrawDate[]).forEach((r) => {
      if (!map.has(r.DRAWID))
        map.set(r.DRAWID, { dates: [], total_txn: 0, total_amt: 0 });
      const g = map.get(r.DRAWID)!;
      g.dates.push(r);
      g.total_txn += r.TT_TXN;
      g.total_amt += r.REFUND_AMT;
    });
    return Array.from(map.entries()).map(([drawid, g]) => ({ drawid, ...g }));
  })();

  const groupedByDate = (() => {
    if (appliedReport !== 4) return [];
    const map = new Map<
      string,
      { draws: RowByDateDraw[]; total_txn: number; total_amt: number }
    >();
    (rows as RowByDateDraw[]).forEach((r) => {
      if (!map.has(r.BANK_DATE))
        map.set(r.BANK_DATE, { draws: [], total_txn: 0, total_amt: 0 });
      const g = map.get(r.BANK_DATE)!;
      g.draws.push(r);
      g.total_txn += r.TT_TXN;
      g.total_amt += r.REFUND_AMT;
    });
    return Array.from(map.entries()).map(([date, g]) => ({ date, ...g }));
  })();

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; inset: 0; padding: 12mm 10mm; }
          .no-print { display: none !important; }
          .hidden.print\\:block { display: block !important; }
          .print-area table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; }
          .print-area table th, .print-area table td { border: 1px solid #000 !important; padding: 3px 6px !important; }
          .print-area table th { background-color: #bfdbfe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px !important; font-weight: bold !important; }
          .print-area table tfoot td { background-color: #bfdbfe !important; font-size: 10px !important; font-weight: bold !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-area .group-header { background-color: #e0f2fe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      <div className="print-area flex flex-col gap-4" ref={printRef}>
        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <RotateCcw size={18} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ລາຍງານ BCEL OnePay Refund
              </h1>
              <p className="text-xs text-slate-400">
                ບັນຊີ 0901300002155 · TXN_TYPE = Refund ONEPAY
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasSearched && rows.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                >
                  {exporting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> ກໍາລັງ
                      Export...
                    </>
                  ) : (
                    <>
                      <FileDown size={13} /> Export Excel
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
                >
                  <Printer size={13} /> ພິມ
                </button>
              </>
            )}
            <button
              onClick={() =>
                hasSearched &&
                fetchData(
                  appliedReport,
                  appliedDateFrom,
                  appliedDateTo,
                  appliedDrawFrom,
                  appliedDrawTo,
                )
              }
              disabled={loading || !hasSearched}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{" "}
              ໂຫຼດໃໝ່
            </button>
          </div>
        </div>

        {/* ── Report type tabs ── */}
        <div className="no-print flex flex-wrap gap-2">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setReportId(r.id);
                setHasSearched(false);
                setRows([]);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border transition ${
                reportId === r.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* ── Selected report description ── */}
        <div className="no-print flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          <LayoutList size={13} />
          <span>
            <b>ລາຍງານທີ {reportId}:</b>{" "}
            {REPORTS.find((r) => r.id === reportId)?.desc}
          </span>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-end gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200 no-print">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          {/* ── Report 1 & 2: Draw range filter ── */}
          {reportId === 1 || reportId === 2 ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ງວດເລີ່ມ
                </label>
                <input
                  type="text"
                  placeholder="ເຊັ່ນ: 680"
                  value={drawFrom}
                  onChange={(e) => setDrawFrom(e.target.value)}
                  className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-36"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ງວດສິ້ນສຸດ
                </label>
                <input
                  type="text"
                  placeholder="ເຊັ່ນ: 690"
                  value={drawTo}
                  onChange={(e) => setDrawTo(e.target.value)}
                  className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-36"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ວັນທີເລີ່ມ
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">
                  ວັນທີສິ້ນສຸດ
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-40"
                />
              </div>
            </>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {loading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...
                </>
              ) : (
                <>
                  <Search size={13} /> ສະແດງຂໍ້ມູນ
                </>
              )}
            </button>
            {(dateFrom || dateTo || drawFrom || drawTo || hasSearched) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <X size={12} /> ລ້າງ
              </button>
            )}
            {hasSearched && (
              <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
                {loading
                  ? "ກໍາລັງດຶງ..."
                  : `${rows.length.toLocaleString()} ລາຍການ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Print header ── */}
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
              style={{ height: "48px", width: "auto", objectFit: "contain" }}
            />
            <p
              style={{ fontSize: "9px", color: "#888", margin: "2px 0 0 2px" }}
            >
              ພິມວັນທີ: {new Date().toLocaleString("lo-LA")}
            </p>
            {user?.displayName && (
              <p
                style={{
                  fontSize: "9px",
                  color: "#888",
                  margin: "1px 0 0 2px",
                }}
              >
                ຜູ້ພິມ: {user.displayName}
              </p>
            )}
          </div>
        </div>
        <div
          className="hidden print:block mb-2"
          style={{ textAlign: "center" }}
        >
          <h1 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>
            ລາຍງານ BCEL OnePay Refund – ລາຍງານທີ {appliedReport}
          </h1>
          <p style={{ fontSize: "10px", margin: "2px 0 0" }}>
            ບັນຊີ: 0901300002155
          </p>
          {filterSummary && (
            <p style={{ fontSize: "10px", color: "#555", marginTop: "3px" }}>
              ຕົວກອງ: {filterSummary}
            </p>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Table area ── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Search size={36} className="opacity-30" />
              <p className="text-sm">
                ເລືອກລາຍງານ ແລ້ວກົດ{" "}
                <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <RotateCcw size={32} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ── Report 1: By Draw ── */}
              {appliedReport === 1 && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={TH} style={{ width: 50 }}>
                        ລຳດັບ
                      </th>
                      <th className={TH}>ງວດ (DRAWID)</th>
                      <th className={TH}>ຈຳນວນ Transaction</th>
                      <th className={TH}>ຈຳນວນເງິນ Refund (ກີບ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as RowByDraw[]).map((r, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                      >
                        <td className={`${TD} text-center text-slate-400`}>
                          {i + 1}
                        </td>
                        <td
                          className={`${TD} text-center font-mono font-semibold text-blue-700`}
                        >
                          {r.DRAWID}
                        </td>
                        <td className={`${TD} text-right font-mono`}>
                          {fmtInt(r.TT_TXN)}
                        </td>
                        <td
                          className={`${TD} text-right font-mono font-semibold text-red-700`}
                        >
                          {fmt(r.REFUND_AMT)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-100 font-bold">
                      <td className={`${TD} text-center`} colSpan={2}>
                        ລວມທັງໝົດ ({rows.length} ງວດ)
                      </td>
                      <td className={`${TD} text-right font-mono`}>
                        {fmtInt(totalTxn)}
                      </td>
                      <td className={`${TD} text-right font-mono text-red-700`}>
                        {fmt(totalAmt)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* ── Report 2: By Draw + Dates ── */}
              {appliedReport === 2 && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={TH} style={{ width: 50 }}>
                        ລຳດັບ
                      </th>
                      <th className={TH}>ງວດ (DRAWID)</th>
                      <th className={TH}>ວັນທີ Refund</th>
                      <th className={TH}>ຈຳນວນ Transaction</th>
                      <th className={TH}>ຈຳນວນເງິນ Refund (ກີບ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByDraw.map((g, gi) => (
                      <>
                        {g.dates.map((r, di) => (
                          <tr
                            key={`${gi}-${di}`}
                            className={di % 2 === 1 ? "bg-slate-50/50" : ""}
                          >
                            {di === 0 && (
                              <td
                                className={`${TD} text-center text-slate-400 align-middle`}
                                rowSpan={g.dates.length}
                              >
                                {gi + 1}
                              </td>
                            )}
                            {di === 0 && (
                              <td
                                className={`${TD} text-center font-mono font-semibold text-blue-700 align-middle`}
                                rowSpan={g.dates.length}
                              >
                                {g.drawid}
                              </td>
                            )}
                            <td className={`${TD} text-center font-mono`}>
                              {r.BANK_DATE}
                            </td>
                            <td className={`${TD} text-right font-mono`}>
                              {fmtInt(r.TT_TXN)}
                            </td>
                            <td
                              className={`${TD} text-right font-mono font-semibold text-red-700`}
                            >
                              {fmt(r.REFUND_AMT)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-semibold text-[11px]">
                          <td className={`${TD} text-center`} colSpan={3}>
                            ລວມງວດ {g.drawid}
                          </td>
                          <td className={`${TD} text-right font-mono`}>
                            {fmtInt(g.total_txn)}
                          </td>
                          <td
                            className={`${TD} text-right font-mono text-red-700`}
                          >
                            {fmt(g.total_amt)}
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-100 font-bold">
                      <td className={`${TD} text-center`} colSpan={3}>
                        ລວມທັງໝົດ ({groupedByDraw.length} ງວດ)
                      </td>
                      <td className={`${TD} text-right font-mono`}>
                        {fmtInt(totalTxn)}
                      </td>
                      <td className={`${TD} text-right font-mono text-red-700`}>
                        {fmt(totalAmt)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* ── Report 3: By Date ── */}
              {appliedReport === 3 && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={TH} style={{ width: 50 }}>
                        ລຳດັບ
                      </th>
                      <th className={TH}>ວັນທີ</th>
                      <th className={TH}>ຈຳນວນ Transaction</th>
                      <th className={TH}>ຈຳນວນເງິນ Refund (ກີບ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as RowByDate[]).map((r, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 1 ? "bg-slate-50/50" : ""}
                      >
                        <td className={`${TD} text-center text-slate-400`}>
                          {i + 1}
                        </td>
                        <td
                          className={`${TD} text-center font-mono font-semibold text-slate-700`}
                        >
                          {r.BANK_DATE}
                        </td>
                        <td className={`${TD} text-right font-mono`}>
                          {fmtInt(r.TT_TXN)}
                        </td>
                        <td
                          className={`${TD} text-right font-mono font-semibold text-red-700`}
                        >
                          {fmt(r.REFUND_AMT)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-100 font-bold">
                      <td className={`${TD} text-center`} colSpan={2}>
                        ລວມທັງໝົດ ({rows.length} ວັນ)
                      </td>
                      <td className={`${TD} text-right font-mono`}>
                        {fmtInt(totalTxn)}
                      </td>
                      <td className={`${TD} text-right font-mono text-red-700`}>
                        {fmt(totalAmt)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* ── Report 4: By Date + Draws ── */}
              {appliedReport === 4 && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className={TH} style={{ width: 50 }}>
                        ລຳດັບ
                      </th>
                      <th className={TH}>ວັນທີ</th>
                      <th className={TH}>ງວດ (DRAWID)</th>
                      <th className={TH}>ຈຳນວນ Transaction</th>
                      <th className={TH}>ຈຳນວນເງິນ Refund (ກີບ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByDate.map((g, gi) => (
                      <>
                        {g.draws.map((r, di) => (
                          <tr
                            key={`${gi}-${di}`}
                            className={di % 2 === 1 ? "bg-slate-50/50" : ""}
                          >
                            {di === 0 && (
                              <td
                                className={`${TD} text-center text-slate-400 align-middle`}
                                rowSpan={g.draws.length}
                              >
                                {gi + 1}
                              </td>
                            )}
                            {di === 0 && (
                              <td
                                className={`${TD} text-center font-mono font-semibold text-slate-700 align-middle`}
                                rowSpan={g.draws.length}
                              >
                                {g.date}
                              </td>
                            )}
                            <td
                              className={`${TD} text-center font-mono font-semibold text-blue-700`}
                            >
                              {r.DRAWID}
                            </td>
                            <td className={`${TD} text-right font-mono`}>
                              {fmtInt(r.TT_TXN)}
                            </td>
                            <td
                              className={`${TD} text-right font-mono font-semibold text-red-700`}
                            >
                              {fmt(r.REFUND_AMT)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 font-semibold text-[11px]">
                          <td className={`${TD} text-center`} colSpan={3}>
                            ລວມວັນທີ {g.date}
                          </td>
                          <td className={`${TD} text-right font-mono`}>
                            {fmtInt(g.total_txn)}
                          </td>
                          <td
                            className={`${TD} text-right font-mono text-red-700`}
                          >
                            {fmt(g.total_amt)}
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-blue-100 font-bold">
                      <td className={`${TD} text-center`} colSpan={3}>
                        ລວມທັງໝົດ ({groupedByDate.length} ວັນ)
                      </td>
                      <td className={`${TD} text-right font-mono`}>
                        {fmtInt(totalTxn)}
                      </td>
                      <td className={`${TD} text-right font-mono text-red-700`}>
                        {fmt(totalAmt)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ── Signature (print only) ── */}
        {hasSearched && rows.length > 0 && (
          <div className="print-signature hidden">
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

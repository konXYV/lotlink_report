"use client";
import React, { useMemo, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Receipt,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import {
  exportScnSellReconciliation,
  type ScnLotlinkRewardReconRow,
} from "@/lib/ExportScnSellReconciliation";

const TITLE = "ລາຍງານ ສົມທຽບລາງວັນ SCN";
const SUBTITLE =
  "Lotlink (LOTLINK_REWARD_SCN) × Portal (SCN_PORTAL_DATA) × BCEL Statement (O_SCN_BCEL_STMT)";

// ── formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined) =>
  n == null || n === 0
    ? ""
    : Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "-";
  const d = String(s).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(s).slice(0, 10);
};

function sumBy<T>(rows: T[], key: keyof T): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 10mm 8mm 20mm 8mm; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100% !important; overflow: visible; padding: 0; }
    .no-print { display: none !important; }
    * { font-family: 'Phetsarath OT','Phetsarath',sans-serif !important; color:#000 !important; box-shadow:none !important; border-radius:0 !important; background:#fff !important; }
    table { font-size: 11px !important; border-collapse: collapse !important; border: 1px solid #000 !important; width: 100% !important; }
    th, td { padding: 2px 4px !important; border: 1px solid #000 !important; white-space: nowrap !important; }
    thead th { background:#fff !important; font-weight:700 !important; text-align:center !important; }
    tr.total-row td { font-weight:700 !important; background:#eee !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .overflow-x-auto { overflow: visible !important; }
  }
`;

const TH =
  "px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-gray-200 border border-black text-[11px]";
const TD =
  "px-2 py-1.5 text-right font-mono border border-black text-[11px] whitespace-nowrap";
const TDC =
  "px-2 py-1.5 text-center font-mono border border-black text-[11px]";

export default function ScnSellReconciliationPage() {
  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo, setDrawTo] = useState("");
  const [rows, setRows] = useState<ScnLotlinkRewardReconRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleApply = async () => {
    setHasSearched(true);
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ view: "scn_lotlink_reward_recon_by_draw" });
      if (drawFrom) qs.set("draw_from", drawFrom);
      if (drawTo) qs.set("draw_to", drawTo);
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ເກີດຂໍ້ຜິດພາດ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDrawFrom("");
    setDrawTo("");
    setHasSearched(false);
    setRows([]);
    setError(null);
  };

  const handlePrint = () => setTimeout(() => window.print(), 100);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportScnSellReconciliation(rows, drawFrom, drawTo);
    } catch (e) {
      alert("Export ຜິດພາດ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const totals = useMemo(
    () => ({
      LOTLINK_WIN_AMT: sumBy(rows, "LOTLINK_WIN_AMT"),
      DIRECT_REWARD_AMT: sumBy(rows, "DIRECT_REWARD_AMT"),
      PROMOTION_REWARD_AMT: sumBy(rows, "PROMOTION_REWARD_AMT"),
      TOTAL_REWARD_AMT: sumBy(rows, "TOTAL_REWARD_AMT"),
      TAX_5PCT_AMT: sumBy(rows, "TAX_5PCT_AMT"),
      REWARD_AND_TAX: sumBy(rows, "REWARD_AND_TAX"),
      BCEL_PAYOUT_AMT: sumBy(rows, "BCEL_PAYOUT_AMT"),
      PAYOUT_DIFF: sumBy(rows, "PAYOUT_DIFF"),
    }),
    [rows],
  );

  const hasData = hasSearched && rows.length > 0;
  const T = TD + " bg-gray-200 font-bold";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Receipt size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">{TITLE}</h1>
              <p className="text-xs text-slate-400">{SUBTITLE}</p>
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
                      <RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...
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

        {/* draw filter */}
        <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            ເລືອກງວດ (ບໍ່ບັງຄັບ)
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ຈາກງວດ</label>
            <input
              type="number"
              value={drawFrom}
              onChange={(e) => setDrawFrom(e.target.value)}
              placeholder="ເຊັ່ນ 26077"
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ຫາງວດ</label>
            <input
              type="number"
              value={drawTo}
              onChange={(e) => setDrawTo(e.target.value)}
              placeholder="ເຊັ່ນ 26098"
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {loading ? "ກຳລັງໂຫຼດ..." : "ສະແດງຂໍ້ມູນ"}
            </button>
            {(drawFrom || drawTo || hasSearched) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                ລ້າງ
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ບໍ່ໄດ້</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <PageSkeleton variant="flat" cols={10} rows={12} />
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white border border-black rounded-xl">
            <Receipt size={36} className="opacity-30" />
            <p className="text-sm">
              ເລືອກງວດ (ຫຼືປ່ອຍວ່າງເພື່ອເບິ່ງທັງຫມົດ) ແລ້ວກົດ{" "}
              <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span>
            </p>
          </div>
        ) : (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            <div className="hidden print:block text-center mb-2 pt-2">
              <div style={{ fontSize: "13px", fontWeight: "bold" }}>{TITLE}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>ງວດ</th>
                    <th className={TH}>ວັນທີ</th>
                    <th className={TH}>ຍອດຖືກລາງວັນລະບົບ Lotlink</th>
                    <th className={TH}>ລາງວັນຕົງ</th>
                    <th className={TH}>ລາງວັນໂປໂມຊັນ</th>
                    <th className={TH}>ລວມລາງວັນ</th>
                    <th className={TH}>ອາກອນ 5%</th>
                    <th className={TH}>ລາງວັນ ແລະ ອາກອນ</th>
                    <th className={TH}>ຈ່າຍລາງວັນ Statement</th>
                    <th className={TH}>ຜິດຫນ້າຈ່າຍລາງວັນ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.DRAW_ID} className="hover:bg-blue-50">
                      <td className={TDC + " text-blue-700 font-semibold"}>{r.DRAW_ID}</td>
                      <td className={TDC}>{fmtDate(r.DRAW_DATE)}</td>
                      <td className={TD}>{fmt(r.LOTLINK_WIN_AMT)}</td>
                      <td className={TD}>{fmt(r.DIRECT_REWARD_AMT)}</td>
                      <td className={TD}>{fmt(r.PROMOTION_REWARD_AMT)}</td>
                      <td className={TD}>{fmt(r.TOTAL_REWARD_AMT)}</td>
                      <td className={TD}>{fmt(r.TAX_5PCT_AMT)}</td>
                      <td className={TD}>{fmt(r.REWARD_AND_TAX)}</td>
                      <td className={TD}>{fmt(r.BCEL_PAYOUT_AMT)}</td>
                      <td className={TD + (r.PAYOUT_DIFF ? " text-red-600 font-semibold" : "")}>
                        {fmt(r.PAYOUT_DIFF)}
                      </td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr className="total-row bg-gray-200 font-bold">
                      <td className={TDC + " bg-gray-200 font-bold"} colSpan={2}>
                        ລວມ
                      </td>
                      <td className={T}>{fmt(totals.LOTLINK_WIN_AMT)}</td>
                      <td className={T}>{fmt(totals.DIRECT_REWARD_AMT)}</td>
                      <td className={T}>{fmt(totals.PROMOTION_REWARD_AMT)}</td>
                      <td className={T}>{fmt(totals.TOTAL_REWARD_AMT)}</td>
                      <td className={T}>{fmt(totals.TAX_5PCT_AMT)}</td>
                      <td className={T}>{fmt(totals.REWARD_AND_TAX)}</td>
                      <td className={T}>{fmt(totals.BCEL_PAYOUT_AMT)}</td>
                      <td className={T}>{fmt(totals.PAYOUT_DIFF)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

"use client";
// ─── ລາຍງານ ຍອດຂາຍ ທຽບ ເງິນເຂົ້າບັນຊີ · ເງິນລາງວັນ ທຽບ ເງິນຈ່າຍອອກ (CL) ─────────────────────
// ແຍກກິດຈະກຳ (ນ້ອງໝານຳໂຊກ / ປູປາເຕົ້າມະຫາໂຊກ) ແລະ ມີແຖບ "ລວມທັງໝົດ"
// ຮູບແບບຕາມໃບສະຫລຸບ Excel: ຍອດຂາຍ − ຄ່າທຳນຽມ 2% ທຽບເງິນເຂົ້າບັນຊີ · ລາງວັນໃນລະບົບ ທຽບ ຈ່າຍອອກຈາກບັນຊີ
import React, { useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  AlertCircle,
  AlertTriangle,
  Scale,
  Printer,
  X,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import {
  DEFAULT_FEE_RATE,
  SVC_LABEL,
  buildDrawRows,
  buildTotals,
  dayLabel,
  fmtInt,
  isOff,
  toSpRows,
  type SpCalc,
  type SpRawRow,
  type SpUnassigned,
  type SvcFilter,
} from "@/lib/clSalesPrizeCore";
import { exportClSalesPrize } from "@/lib/ExportClSalesPrize";
import { useAuth } from "@/lib/authContext";

const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 8mm 6mm 12mm 6mm; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100%; }
    .no-print { display: none !important; }
    * { font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important; color: #000 !important; box-shadow: none !important; }
    table { font-size: 8px !important; border-collapse: collapse !important; width: 100% !important; }
    th, td { padding: 2px 3px !important; border: 1px solid #000 !important; white-space: nowrap !important; }
    thead th { background: #d9d9d9 !important; }
    tr.total-row td { background: #bfbfbf !important; font-weight: bold !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

type TabKey = SvcFilter;
const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "ລວມທັງໝົດ" },
  { key: "DOG", label: SVC_LABEL.DOG },
  { key: "PUP", label: SVC_LABEL.PUP },
];

const TH =
  "px-2 py-2 text-center font-bold text-slate-700 bg-slate-200 border border-black text-[11px] whitespace-nowrap";
const THS =
  "px-2 py-2 text-center font-bold text-slate-700 bg-sky-100 border border-black text-[11px] whitespace-nowrap";
const THP =
  "px-2 py-2 text-center font-bold text-slate-700 bg-emerald-100 border border-black text-[11px] whitespace-nowrap";
const TD =
  "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap";
const TDL =
  "px-2 py-1.5 text-left border border-black text-[11px] whitespace-nowrap";
const TDC =
  "px-2 py-1.5 text-center border border-black text-[11px] whitespace-nowrap";

// ສ່ວນຕ່າງ ≠ 0 → ສີແດງ
const diffCls = (n: number) =>
  isOff(n) ? "text-red-600 font-bold bg-red-50" : "";

export default function ClSalesPrizeReportPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [rows, setRows] = useState<SpRawRow[]>([]);
  const [unassigned, setUnassigned] = useState<SpUnassigned>({
    BANK_IN: 0,
    BANK_PAID: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");
  const [tab, setTab] = useState<TabKey>("ALL");
  const [feePct, setFeePct] = useState(String(DEFAULT_FEE_RATE * 100));
  const [onlyDiff, setOnlyDiff] = useState(false);

  const rate = useMemo(() => {
    const n = Number(feePct);
    return Number.isFinite(n) && n >= 0 && n < 100 ? n / 100 : DEFAULT_FEE_RATE;
  }, [feePct]);

  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        view: "sales_prize_by_draw",
        date_from: from,
        date_to: to,
      });
      const res = await fetch(`/api/oracle/CL?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(toSpRows(Array.isArray(json.rows) ? json.rows : []));
      setUnassigned({
        BANK_IN: Number(json.unassigned?.BANK_IN ?? 0),
        BANK_PAID: Number(json.unassigned?.BANK_PAID ?? 0),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setUnassigned({ BANK_IN: 0, BANK_PAID: 0 });
    } finally {
      setLoading(false);
    }
  };

  const canApply = !!dateFrom && !!dateTo && dateFrom <= dateTo;

  const handleApply = () => {
    if (!canApply) return;
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setHasSearched(true);
    fetchData(dateFrom, dateTo);
  };
  const handleClear = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setHasSearched(false);
    setRows([]);
    setUnassigned({ BANK_IN: 0, BANK_PAID: 0 });
    setError(null);
  };
  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportClSalesPrize(rows, rate, appliedFrom, appliedTo, unassigned);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const totals = useMemo(() => buildTotals(rows, rate), [rows, rate]);
  const allDraws = useMemo(
    () => buildDrawRows(rows, tab, rate),
    [rows, tab, rate],
  );
  const draws = useMemo(
    () =>
      onlyDiff
        ? allDraws.filter((d) => isOff(d.c.DIFF_IN) || isOff(d.c.DIFF_PRIZE))
        : allDraws,
    [allDraws, onlyDiff],
  );
  const drawTotal = useMemo(() => {
    const t = buildTotals(
      draws.map((d) => ({
        SVC: d.SVC,
        DRAWID: d.DRAWID,
        DAY: d.DAY,
        SALES: d.SALES,
        SALES_APP: d.SALES_APP,
        POINT_APP: d.POINT_APP,
        BANK_IN: d.BANK_IN,
        PRIZE: d.PRIZE,
        PRIZE_APP: d.PRIZE_APP,
        BANK_PAID: d.BANK_PAID,
      })),
      rate,
    );
    return t.ALL;
  }, [draws, rate]);
  const offCount = useMemo(
    () =>
      allDraws.filter((d) => isOff(d.c.DIFF_IN) || isOff(d.c.DIFF_PRIZE))
        .length,
    [allDraws],
  );
  const drawCount = (s: SvcFilter) =>
    s === "ALL" ? rows.length : rows.filter((r) => r.SVC === s).length;

  const hasData = hasSearched && !loading && rows.length > 0;
  const activeLabel = TABS.find((t) => t.key === tab)!.label;
  const hasUnassigned =
    isOff(unassigned.BANK_IN) || isOff(unassigned.BANK_PAID);
  const feeLabel = `${Number((rate * 100).toFixed(2))}%`;

  const calcCells = (c: SpCalc) => (
    <>
      <td className={TD}>{fmtInt(c.SALES)}</td>
      <td className={TD}>{fmtInt(c.SALES_APP)}</td>
      <td className={TD}>{fmtInt(c.SALES_POS)}</td>
      <td className={TD}>{fmtInt(c.POINT_APP)}</td>
      <td className={TD}>{fmtInt(c.SALES_CASH)}</td>
      <td className={TD}>{fmtInt(c.FEE)}</td>
      <td className={TD}>{fmtInt(c.NET)}</td>
      <td className={TD}>{fmtInt(c.BANK_IN)}</td>
      <td className={`${TD} ${diffCls(c.DIFF_IN)}`}>{fmtInt(c.DIFF_IN)}</td>
      <td className={TD}>{fmtInt(c.PRIZE)}</td>
      <td className={TD}>{fmtInt(c.PRIZE_APP)}</td>
      <td className={TD}>{fmtInt(c.PRIZE_POS)}</td>
      <td className={TD}>{fmtInt(c.BANK_PAID)}</td>
      <td className={`${TD} ${diffCls(c.DIFF_PRIZE)}`}>
        {fmtInt(c.DIFF_PRIZE)}
      </td>
    </>
  );

  const groupHead = (
    <>
      <th colSpan={9} className={THS}>
        ຍອດຂາຍ ທຽບ ເງິນເຂົ້າບັນຊີ (ຄິດສະເພາະ APP)
      </th>
      <th colSpan={5} className={THP}>
        ເງິນລາງວັນ ທຽບ ຈ່າຍອອກຈາກບັນຊີ (ຄິດສະເພາະ APP)
      </th>
    </>
  );
  const subHead = (
    <>
      <th className={THS}>ຍອດຂາຍລວມ</th>
      <th className={THS}>APP</th>
      <th className={THS}>POS</th>
      <th className={THS}>ຄະແນນ (APP)</th>
      <th className={THS}>APP ຫຼັງຫັກຄະແນນ</th>
      <th className={THS}>ຄ່າທຳນຽມ {feeLabel} (APP)</th>
      <th className={THS}>ຫຼັງຫັກຄ່າທຳນຽມ</th>
      <th className={THS}>ເງິນເຂົ້າບັນຊີຈິງ</th>
      <th className={THS}>ສ່ວນຕ່າງ</th>
      <th className={THP}>ລາງວັນລວມ</th>
      <th className={THP}>APP</th>
      <th className={THP}>POS</th>
      <th className={THP}>ຈ່າຍອອກຈາກບັນຊີ</th>
      <th className={THP}>ສ່ວນຕ່າງ</th>
    </>
  );

  // ── ຕາຕະລາງສະຫລຸບຕາມກິດຈະກຳ ──
  const summaryRows: {
    key: string;
    label: string;
    n: number;
    c: SpCalc;
    grand?: boolean;
  }[] =
    tab === "ALL"
      ? [
          {
            key: "DOG",
            label: SVC_LABEL.DOG,
            n: drawCount("DOG"),
            c: totals.DOG,
          },
          {
            key: "PUP",
            label: SVC_LABEL.PUP,
            n: drawCount("PUP"),
            c: totals.PUP,
          },
          {
            key: "ALL",
            label: "ລວມທັງໝົດ",
            n: drawCount("ALL"),
            c: totals.ALL,
            grand: true,
          },
        ]
      : [
          {
            key: tab,
            label: SVC_LABEL[tab],
            n: drawCount(tab),
            c: totals[tab],
            grand: true,
          },
        ];

  const renderSummary = () => (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th rowSpan={2} className={TH}>
            ກິດຈະກຳ
          </th>
          <th rowSpan={2} className={TH}>
            ຈຳນວນງວດ
          </th>
          {groupHead}
        </tr>
        <tr>{subHead}</tr>
      </thead>
      <tbody>
        {summaryRows.map((s) => (
          <tr
            key={s.key}
            className={
              s.grand ? "total-row bg-slate-300 font-bold" : "bg-white"
            }
          >
            <td className={TDL}>{s.label}</td>
            <td className={TDC}>{s.n.toLocaleString()}</td>
            {calcCells(s.c)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderDraws = () => (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th rowSpan={2} className={TH}>
            ງວດ
          </th>
          <th rowSpan={2} className={TH}>
            ວັນທີ
          </th>
          {tab === "ALL" && (
            <th rowSpan={2} className={TH}>
              ກິດຈະກຳ
            </th>
          )}
          {groupHead}
        </tr>
        <tr>{subHead}</tr>
      </thead>
      <tbody>
        {draws.map((d) => (
          <tr key={`${d.SVC}${d.DRAWID}`} className="bg-white hover:bg-blue-50">
            <td className={TDC}>{d.DRAWID}</td>
            <td className={TDC}>{dayLabel(d.DAY)}</td>
            {tab === "ALL" && <td className={TDL}>{SVC_LABEL[d.SVC]}</td>}
            {calcCells(d.c)}
          </tr>
        ))}
        <tr className="total-row bg-slate-300 font-bold">
          <td className={TDC} colSpan={tab === "ALL" ? 3 : 2}>
            ລວມ ({draws.length.toLocaleString()} ງວດ)
          </td>
          {calcCells(drawTotal)}
        </tr>
      </tbody>
    </table>
  );

  const emptyMsg = (text: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
      <Scale size={36} className="opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Scale size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ຍອດຂາຍ · ເງິນເຂົ້າບັນຊີ · ເງິນລາງວັນ ຕາມງວດ (CL)
              </h1>
              <p className="text-xs text-slate-400">
                CL_LOTTO_SELL · CL_LOTTO_REWARD · CL_BCEL_STMT (0101300016617
                ເງິນເຂົ້າ / 0101300016635 ຈ່າຍລາງວັນ)
              </p>
            </div>
          </div>
          {hasData && (
            <div className="flex items-center gap-2">
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
                    <FileSpreadsheet size={13} /> Export Excel (3 sheet)
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
              >
                <Printer size={13} /> ພິມ A4
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="no-print flex items-center gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t.key
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (DRAWDATE ຂອງ CL_LOTTO_SELL —
            ເງິນເຂົ້າຈະຕິດຕາມງວດໃຫ້ ເຖິງຈະຂ້າມວັນ/ຂ້າມເດືອນ)
          </div>
          {[
            { label: "ວັນທີ ຈາກ", v: dateFrom, set: setDateFrom },
            { label: "ວັນທີ ຫາ", v: dateTo, set: setDateTo },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">
                {f.label}
              </label>
              <input
                type="date"
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">
              ຄ່າທຳນຽມ (%)
            </label>
            <input
              type="number"
              min={0}
              max={99}
              step="0.01"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDiff}
              onChange={(e) => setOnlyDiff(e.target.checked)}
              className="accent-amber-600"
            />
            ສະເພາະງວດທີ່ມີສ່ວນຕ່າງ
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading || !canApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition"
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
            {(dateFrom || dateTo || hasSearched) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <X size={12} /> ລ້າງ
              </button>
            )}
          </div>
          {dateFrom && dateTo && dateFrom > dateTo && (
            <p className="w-full text-xs text-red-600">
              ວັນທີເລີ່ມຕົ້ນຕ້ອງບໍ່ເກີນວັນທີສິ້ນສຸດ
            </p>
          )}
        </div>

        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle (CL) ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {hasData && hasUnassigned && (
          <div className="no-print flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                ມີທຸລະກຳທະນາຄານທີ່ບໍ່ຖືກຜູກກັບງວດ (DRAWID ຫວ່າງ ຫຼື ບໍ່ແມ່ນ
                11/36)
              </p>
              <p className="text-xs mt-0.5">
                ເງິນເຂົ້າ {fmtInt(unassigned.BANK_IN)} · ຈ່າຍລາງວັນ{" "}
                {fmtInt(unassigned.BANK_PAID)} — ຍອດນີ້ບໍ່ຢູ່ໃນຕາຕະລາງລຸ່ມ
              </p>
            </div>
          </div>
        )}

        {/* Print header */}
        <div
          className="hidden print:block mb-2"
          style={{ textAlign: "center" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sokxay.png"
            alt="Logo"
            style={{ height: "44px", objectFit: "contain" }}
          />
          <p style={{ fontSize: "8px", margin: "2px 0" }}>
            ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            {user?.displayName ? ` · ຜູ້ພິມ: ${user.displayName}` : ""}
          </p>
          <h1 style={{ fontSize: "13px", fontWeight: "bold" }}>
            ລາຍງານ ຍອດຂາຍ · ເງິນເຂົ້າບັນຊີ · ເງິນລາງວັນ — {activeLabel}
          </h1>
          <div style={{ fontSize: "10px" }}>
            ວັນທີ: {appliedFrom || "—"} ຫາ {appliedTo || "—"} · ຄ່າທຳນຽມ{" "}
            {feeLabel}
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          </div>
        ) : !hasSearched ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            {emptyMsg(
              <>
                ເລືອກຊ່ວງວັນທີ ແລ້ວກົດ{" "}
                <span className="font-semibold text-amber-600">
                  ສະແດງຂໍ້ມູນ
                </span>
              </>,
            )}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            {emptyMsg("ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ")}
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5">
                ສະຫລຸບຕາມກິດຈະກຳ
              </p>
              <div className="bg-white border border-black rounded-xl overflow-hidden overflow-x-auto">
                {renderSummary()}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-2">
                ລາຍລະອຽດຕາມງວດ — {activeLabel}
                {offCount > 0 && (
                  <span className="no-print text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                    ມີສ່ວນຕ່າງ {offCount.toLocaleString()} ງວດ
                  </span>
                )}
              </p>
              <div className="bg-white border border-black rounded-xl overflow-hidden overflow-x-auto">
                {draws.length === 0
                  ? emptyMsg("ບໍ່ມີງວດທີ່ມີສ່ວນຕ່າງ")
                  : renderDraws()}
              </div>
            </div>
            <p className="no-print text-xs text-slate-400">
              ໝາຍເຫດ: APP = USERNAME 0101001APP, ອື່ນໆ = POS (ບໍ່ຜ່ານບັນຊີນີ້) ·
              ຄະແນນ = ຍອດ APP ທີ່ USEPOINTFLAG = 1 (ບໍ່ມີເງິນເຂົ້າ) ·
              ສ່ວນຕ່າງເງິນເຂົ້າ = ເງິນເຂົ້າບັນຊີຈິງ − ((ຍອດ APP − ຄະແນນ) −
              ຄ່າທຳນຽມ) · ສ່ວນຕ່າງລາງວັນ = ລາງວັນ APP − ຈ່າຍອອກຈາກບັນຊີ ·
              ຕົວເລກແດງ = ບໍ່ກົງກັນ.
            </p>
          </>
        )}
      </div>
    </>
  );
}

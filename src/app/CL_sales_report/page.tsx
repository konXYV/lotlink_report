"use client";
// ─── ລາຍງານຂາຍ (CL) : ຍອດຂາຍໃນລະບົບ ທຽບ ເງິນເຂົ້າບັນຊີ 0101300016617 ───────────────────────────────
// ຮູບແບບຕົງກັບໃບສະຫລຸບ Excel "3626-Sales": ແຖວ APP → ລວມ → ແຖວຜູ້ຂາຍອື່ນ (PDF) → ລວມ → ລວມທັງໝົດ
// ຈ່າຍຄະແນນ (USEPOINTFLAG = 1) ແຍກອອກຈາກເງິນສົດ · ຄ່າທຳນຽມຄິດຈາກເງິນສົດ · ສ່ວນຕ່າງ = ເງິນເຂົ້າບັນຊີ − ຍອດຫຼັງຫັກຄ່າທຳນຽມ
import React, { useMemo, useState } from "react";
import { RefreshCw, Search, AlertCircle, AlertTriangle, Scale, Printer, X, Filter, FileSpreadsheet } from "lucide-react";
import {
  ACCT_SALES_IN,
  DEFAULT_FEE_RATE,
  SVC_LABEL,
  buildSales,
  dayLabel,
  fmt2,
  isOff,
  toSalesRows,
  type Block,
  type SalesCalc,
  type SalesRaw,
  type SvcFilter,
} from "@/lib/clSalesPrizeCore";
import { exportClSales } from "@/lib/ExportClSales";
import { useAuth } from "@/lib/authContext";
import { SIGNERS, FONT_CSS } from "@/lib/clXlsxCommon";

const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 8mm 6mm 12mm 6mm; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100%; }
    .no-print { display: none !important; }
    * { font-family: "CLMix", 'Phetsarath OT', 'Phetsarath', 'Arial Narrow', sans-serif !important; color: #000 !important; box-shadow: none !important; }
    table { font-size: 8px !important; border-collapse: collapse !important; width: 100% !important; }
    th, td { padding: 2px 3px !important; border: 1px solid #000 !important; white-space: nowrap !important; }
    thead th { background: #e2efda !important; }
    tr.sub-row td { background: #e7e6e6 !important; font-weight: bold !important; }
    tr.grand-row td { background: #fff2cc !important; font-weight: bold !important; }
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

// ສີຕາມຕົ້ນແບບ: ຫົວຂຽວອ່ອນ · ລວມຍ່ອຍເທົາ · ລວມທັງໝົດເຫຼືອງອ່ອນ
const TH = "px-2 py-2 text-center font-normal text-slate-800 bg-[#e2efda] border border-black text-[11px] whitespace-nowrap";
const TD = "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap";
const TDC = "px-2 py-1.5 text-center border border-black text-[11px] whitespace-nowrap";
const SUB = "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap bg-[#e7e6e6] font-bold";
const GRAND = "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap bg-[#fff2cc] font-bold";
const diffCls = (n: number) => (isOff(n) ? "text-red-600 font-bold bg-red-50" : "");

export default function ClSalesReportPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [rows, setRows] = useState<SalesRaw[]>([]);
  const [unBankIn, setUnBankIn] = useState(0);
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
      const qs = new URLSearchParams({ view: "sales_by_draw", date_from: from, date_to: to });
      const res = await fetch(`/api/oracle/CL?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(toSalesRows(Array.isArray(json.rows) ? json.rows : []));
      setUnBankIn(Number(json.unassigned?.BANK_IN ?? 0));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setUnBankIn(0);
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
    setUnBankIn(0);
    setError(null);
  };
  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportClSales(rows, rate, appliedFrom, appliedTo, tab);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const sec = useMemo(() => buildSales(rows, tab, rate, onlyDiff), [rows, tab, rate, onlyDiff]);
  const offCount = useMemo(
    () => buildSales(rows, tab, rate, true).app.lines.length,
    [rows, tab, rate],
  );
  const hasData = hasSearched && !loading && rows.length > 0;
  const activeLabel = TABS.find((t) => t.key === tab)!.label;
  const feeLabel = `${Number((rate * 100).toFixed(2))}%`;
  const noVisible = sec.app.lines.length === 0 && sec.other.lines.length === 0;

  const header = (
    <thead>
      <tr>
        <th rowSpan={2} className={TH}>ລຳດັບ</th>
        <th rowSpan={2} className={TH}>ລະຫັດຜູ້ຂາຍ</th>
        <th rowSpan={2} className={TH}>ວັນທີ</th>
        <th rowSpan={2} className={TH}>ງວດ</th>
        <th colSpan={2} className={TH}>ຍອດຂາຍ</th>
        <th rowSpan={2} className={`${TH} font-bold`}>ລວມມູນຄ່າຂາຍໄດ້</th>
        <th className={TH}>ຄ່າທໍານຽມ</th>
        <th rowSpan={2} className={TH}>ຍອດຂາຍຫຼັງຫັກຄ່າທໍານຽມ</th>
        <th className={TH}>ເງິນເຂົ້າບັນຊີ</th>
        <th rowSpan={2} className={`${TH} text-red-700`}>
          ສ່ວນຕ່າງຍອດຂາຍໃນລະບົບ<br />ແລະ ຍອດເງິນເຂົ້າບັນຊີ
        </th>
      </tr>
      <tr>
        <th className={TH}>ຈ່າຍເງິນສົດ</th>
        <th className={TH}>ຈ່າຍຄະແນນ</th>
        <th className={TH}>{feeLabel}</th>
        <th className={`${TH} font-bold`}>{ACCT_SALES_IN}</th>
      </tr>
    </thead>
  );

  const lineRows = (b: Block<SalesRaw, SalesCalc>, isApp: boolean) =>
    b.lines.map((l) => (
      <tr key={`${l.DRAWID}-${l.USERNAME}`} className="bg-white hover:bg-blue-50">
        <td className={TDC}>{l.no}</td>
        <td className={TDC}>{l.USERNAME}</td>
        <td className={TDC}>{dayLabel(l.DAY)}</td>
        <td className={TDC}>{l.DRAWID}</td>
        <td className={TD}>{fmt2(l.c.CASH)}</td>
        <td className={TD}>{fmt2(l.c.POINT)}</td>
        <td className={`${TD} font-bold`}>{fmt2(l.c.TOTAL)}</td>
        {isApp ? (
          <>
            <td className={TD}>{fmt2(l.c.FEE)}</td>
            <td className={TD}>{fmt2(l.c.NET)}</td>
            <td className={TD}>{fmt2(l.c.BANK_IN)}</td>
            <td className={`${TD} ${diffCls(l.c.DIFF)}`}>{fmt2(l.c.DIFF)}</td>
          </>
        ) : (
          <td colSpan={4} className={TD} />
        )}
      </tr>
    ));

  const subRow = (label: string, c: SalesCalc, cls: string, full: boolean, rowCls: string) => (
    <tr className={rowCls}>
      <td colSpan={4} className={`${cls} text-center`}>{label}</td>
      <td className={cls}>{fmt2(c.CASH)}</td>
      <td className={cls}>{fmt2(c.POINT)}</td>
      <td className={cls}>{fmt2(c.TOTAL)}</td>
      {full ? (
        <>
          <td className={cls}>{fmt2(c.FEE)}</td>
          <td className={cls}>{fmt2(c.NET)}</td>
          <td className={cls}>{fmt2(c.BANK_IN)}</td>
          <td className={`${cls} ${diffCls(c.DIFF)}`}>{fmt2(c.DIFF)}</td>
        </>
      ) : (
        <td colSpan={4} className={cls} />
      )}
    </tr>
  );

  const emptyMsg = (text: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
      <Scale size={36} className="opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );

  return (
    <>
      <style>{FONT_CSS + PRINT_CSS}</style>
      <div className="print-area cl-font flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Scale size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານຂາຍ ຕາມງວດ (CL)</h1>
              <p className="text-xs text-slate-400">
                CL_LOTTO_SELL ທຽບ CL_BCEL_STMT · ບັນຊີຮັບເງິນຂາຍ {ACCT_SALES_IN}
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
                  <><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</>
                ) : (
                  <><FileSpreadsheet size={13} /> Export Excel</>
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
                tab === t.key ? "border-emerald-500 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (DRAWDATE ຂອງ CL_LOTTO_SELL — ເງິນເຂົ້າຈະຕິດຕາມງວດໃຫ້ ເຖິງຈະຂ້າມວັນ/ຂ້າມເດືອນ)
          </div>
          {[
            { label: "ວັນທີ ຈາກ", v: dateFrom, set: setDateFrom },
            { label: "ວັນທີ ຫາ", v: dateTo, set: setDateTo },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">{f.label}</label>
              <input
                type="date"
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ຄ່າທຳນຽມ (%)</label>
            <input
              type="number"
              min={0}
              max={99}
              step="0.01"
              value={feePct}
              onChange={(e) => setFeePct(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyDiff}
              onChange={(e) => setOnlyDiff(e.target.checked)}
              className="accent-emerald-600"
            />
            ສະເພາະງວດທີ່ມີສ່ວນຕ່າງ
          </label>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading || !canApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
            >
              {loading ? (
                <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
              ) : (
                <><Search size={13} /> ສະແດງຂໍ້ມູນ</>
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
            <p className="w-full text-xs text-red-600">ວັນທີເລີ່ມຕົ້ນຕ້ອງບໍ່ເກີນວັນທີສິ້ນສຸດ</p>
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

        {hasData && isOff(unBankIn) && (
          <div className="no-print flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ມີເງິນເຂົ້າບັນຊີທີ່ບໍ່ຖືກຜູກກັບງວດ (DRAWID ຫວ່າງ ຫຼື ບໍ່ແມ່ນ 11/36)</p>
              <p className="text-xs mt-0.5">ເງິນເຂົ້າ {fmt2(unBankIn)} — ຍອດນີ້ບໍ່ຢູ່ໃນຕາຕະລາງລຸ່ມ</p>
            </div>
          </div>
        )}

        {/* Print header */}
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sokxay.png" alt="Logo" style={{ height: "44px", objectFit: "contain" }} />
          <p style={{ fontSize: "8px", margin: "2px 0" }}>
            ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            {user?.displayName ? ` · ຜູ້ພິມ: ${user.displayName}` : ""}
          </p>
          <h1 style={{ fontSize: "13px", fontWeight: "bold" }}>ລາຍງານຂາຍ — {activeLabel}</h1>
          <div style={{ fontSize: "10px" }}>
            ວັນທີ: {appliedFrom || "—"} ຫາ {appliedTo || "—"} · ຄ່າທຳນຽມ {feeLabel} · ບັນຊີ {ACCT_SALES_IN}
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
            {emptyMsg(<>ເລືອກຊ່ວງວັນທີ ແລ້ວກົດ <span className="font-semibold text-emerald-600">ສະແດງຂໍ້ມູນ</span></>)}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            {emptyMsg("ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ")}
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-2">
              ລາຍລະອຽດຕາມງວດ — {activeLabel}
              {offCount > 0 && (
                <span className="no-print text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                  ມີສ່ວນຕ່າງ {offCount.toLocaleString()} ງວດ
                </span>
              )}
            </p>
            <div className="bg-white border border-black rounded-xl overflow-hidden overflow-x-auto">
              {noVisible ? (
                emptyMsg("ບໍ່ມີງວດທີ່ມີສ່ວນຕ່າງ")
              ) : (
                <table className="w-full border-collapse">
                  {header}
                  <tbody>
                    {lineRows(sec.app, true)}
                    {subRow("ລວມຍອດຂາຍ ຜ່ານ APP", sec.app.total, SUB, true, "sub-row")}
                    {lineRows(sec.other, false)}
                    {sec.other.lines.length > 0 &&
                      subRow("ລວມຍອດຂາຍ ຜ່ານ POS", sec.other.total, SUB, false, "sub-row")}
                    {subRow("ລວມທັງໝົດ", sec.grand, GRAND, false, "grand-row")}
                  </tbody>
                </table>
              )}
            </div>
            {/* ລາຍເຊັນ 4 ຊ່ອງ */}
            <div className="grid grid-cols-4 gap-4 pt-6 text-center signature-block" style={{ pageBreakInside: "avoid" }}>
              {SIGNERS.map((t) => (
                <div key={t}>
                  <p className="text-xs font-bold underline">{t}</p>
                  <div style={{ height: "56px" }} />
                </div>
              ))}
            </div>
            <p className="no-print text-xs text-slate-400">
              ໝາຍເຫດ: ຈ່າຍຄະແນນ = ຍອດຂາຍທີ່ USEPOINTFLAG = 1 (ບໍ່ມີເງິນເຂົ້າບັນຊີ) · ຄ່າທຳນຽມ = ຈ່າຍເງິນສົດ × {feeLabel} ·
              ສ່ວນຕ່າງ = ເງິນເຂົ້າບັນຊີ − ຍອດຂາຍຫຼັງຫັກຄ່າທຳນຽມ · ເງິນເຂົ້າບັນຊີເປັນຂອງ APP ເທົ່ານັ້ນ · ຕົວເລກແດງ = ບໍ່ກົງກັນ.
            </p>
          </>
        )}
      </div>
    </>
  );
}

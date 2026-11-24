"use client";
// ─── ກະທົບຍ່ອຍ ລາງວັນ CL : ລາຍການຖືກລາງວັນໃນລະບົບ (CL_LOTTO_REWARD) ທຽບ ການຈ່າຍລາງວັນໃນ Statement (CL_BCEL_STMT) ───
// ບັນຊີຈ່າຍລາງວັນ 0101300016635 · ກະທົບລະດັບໃບບິນ · ແຍກກິດຈະກຳ (ໝານຳໂຊກ / ປູປາເຕົ້າມະຫາໂຊກ)
// ໜ້າໃໝ່ ແຍກຕ່າງຫາກ — ບໍ່ກະທົບໜ້າ/ລາຍງານອື່ນ
import React, { useMemo, useState } from "react";
import { RefreshCw, Search, AlertCircle, AlertTriangle, GitCompareArrows, Printer, X, Filter, FileSpreadsheet } from "lucide-react";
import {
  ACCT_PRIZE_OUT,
  STATUS_LABEL,
  SVC_LABEL,
  dayLabel,
  filterByTab,
  fmt2,
  isOff,
  summarize,
  type MatchStatus,
  type MatchTab,
  type PrizeMatchRow,
} from "@/lib/clPrizeMatchCore";
import { exportClPrizeMatch } from "@/lib/ExportClPrizeMatch";
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
    thead th { background: #ffe699 !important; }
    tr.grand-row td { background: #fff2cc !important; font-weight: bold !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

const TABS: { key: MatchTab; label: string }[] = [
  { key: "ALL", label: "ລວມທັງໝົດ" },
  { key: "DOG", label: SVC_LABEL.DOG },
  { key: "PUP", label: SVC_LABEL.PUP },
];

type StatusFilter = "ALL" | MatchStatus;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "ທັງໝົດ" },
  { key: "MATCH", label: STATUS_LABEL.MATCH },
  { key: "DIFF", label: STATUS_LABEL.DIFF },
  { key: "NOT_PAID", label: STATUS_LABEL.NOT_PAID },
  { key: "NOT_IN_SYSTEM", label: STATUS_LABEL.NOT_IN_SYSTEM },
];

const STATUS_CLS: Record<MatchStatus, string> = {
  MATCH: "bg-emerald-100 text-emerald-700",
  DIFF: "bg-amber-100 text-amber-700",
  NOT_PAID: "bg-red-100 text-red-700",
  NOT_IN_SYSTEM: "bg-purple-100 text-purple-700",
};

const TH = "px-2 py-2 text-center font-normal text-slate-800 bg-[#ffe699] border border-black text-[11px] whitespace-nowrap";
const TD = "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap";
const TDC = "px-2 py-1.5 text-center border border-black text-[11px] whitespace-nowrap";
const GRAND = "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap bg-[#fff2cc] font-bold";
const PAGE_SIZE = 200; // ຈຳກັດແຖວທີ່ສະແດງຕໍ່ໜ້າ ເພື່ອບໍ່ໃຫ້ໜ້າເວັບໜັກ (Excel/ພິມ ແມ່ນຄົບທຸກແຖວ)

export default function ClPrizeMatchPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [rows, setRows] = useState<PrizeMatchRow[]>([]);
  const [excluded, setExcluded] = useState({ OTHER_USER: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");
  const [tab, setTab] = useState<MatchTab>("ALL");
  const [statusF, setStatusF] = useState<StatusFilter>("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [printAll, setPrintAll] = useState(false);

  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ date_from: from, date_to: to });
      const res = await fetch(`/api/oracle/CL_prize_match?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
      setExcluded({ OTHER_USER: Number(json.excluded?.OTHER_USER ?? 0) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
      setExcluded({ OTHER_USER: 0 });
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
    setPage(0);
    fetchData(dateFrom, dateTo);
  };
  const handleClear = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setHasSearched(false);
    setRows([]);
    setError(null);
    setQ("");
    setStatusF("ALL");
    setPage(0);
  };
  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setPrintAll(true);
    setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 150);
  };
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportClPrizeMatch(rows, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const tabRows = useMemo(() => filterByTab(rows, tab), [rows, tab]);
  const sum = useMemo(() => summarize(tabRows), [tabRows]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return tabRows.filter(
      (r) =>
        (statusF === "ALL" || r.STATUS === statusF) &&
        (!k || r.BILL.toLowerCase().includes(k) || r.DRAWID.toLowerCase().includes(k) || r.CLIENTREF.toLowerCase().includes(k)),
    );
  }, [tabRows, statusF, q]);
  const shownSum = useMemo(() => summarize(shown), [shown]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const curPage = Math.min(page, pages - 1);
  const visible = printAll ? shown : shown.slice(curPage * PAGE_SIZE, (curPage + 1) * PAGE_SIZE);
  const hasData = hasSearched && !loading && rows.length > 0;
  const activeLabel = TABS.find((t) => t.key === tab)!.label;
  const offCount = sum.count.DIFF + sum.count.NOT_PAID + sum.count.NOT_IN_SYSTEM;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <style>{FONT_CSS}</style>
      <div className="print-area cl-font flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <GitCompareArrows size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ກະທົບຍ່ອຍ ລາງວັນ CL — ລະບົບ ທຽບ Statement {ACCT_PRIZE_OUT}</h1>
              <p className="text-xs text-slate-400">CL_LOTTO_REWARD ທຽບ CL_BCEL_STMT · ກະທົບລະດັບໃບບິນ · ແຍກຕາມກິດຈະກຳ</p>
            </div>
          </div>
          {hasData && (
            <div className="flex items-center gap-2">
              <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
                {exporting ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</> : <><FileSpreadsheet size={13} /> Export Excel</>}
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="no-print flex items-center gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(0); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t.key ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="no-print bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (ວັນທີງວດ DRAWDATE)
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈາກ</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຫາ</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleApply} disabled={loading || !canApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition">
              {loading ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</> : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(dateFrom || dateTo || hasSearched) && (
              <button onClick={handleClear} className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງ
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle (CL) ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {hasData && (
          <div className="no-print grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-500">ຍອດຖືກລາງວັນໃນລະບົບ</p>
              <p className="text-sm font-bold font-mono text-slate-800">{fmt2(sum.sysAmt)}</p>
              <p className="text-[11px] text-slate-400">{sum.bills.toLocaleString()} ໃບບິນ</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-500">ຈ່າຍອອກ Statement</p>
              <p className="text-sm font-bold font-mono text-slate-800">{fmt2(sum.bankAmt)}</p>
              <p className="text-[11px] text-slate-400">FEE {fmt2(sum.feeAmt)} · TAX {fmt2(sum.taxAmt)}</p>
            </div>
            <div className={`border rounded-xl p-3 ${isOff(sum.diff) ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-200"}`}>
              <p className="text-xs text-slate-500">ສ່ວນຕ່າງ (ລາງວັນ)</p>
              <p className={`text-sm font-bold font-mono ${isOff(sum.diff) ? "text-amber-700" : "text-emerald-700"}`}>
                {fmt2(sum.diff)} {!isOff(sum.diff) && <span className="text-xs font-normal">✓ ສົມດູນ</span>}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs text-emerald-600">ກົງກັນ</p>
              <p className="text-sm font-bold font-mono text-emerald-700">{sum.count.MATCH.toLocaleString()} ບິນ</p>
            </div>
            <div className={`border rounded-xl p-3 ${offCount ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
              <p className={`text-xs ${offCount ? "text-red-600" : "text-slate-500"}`}>ຕ້ອງກວດ</p>
              <p className={`text-sm font-bold font-mono ${offCount ? "text-red-700" : "text-slate-700"}`}>{offCount.toLocaleString()} ບິນ</p>
            </div>
          </div>
        )}

        {hasData && excluded.OTHER_USER > 0 && (
          <div className="no-print flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              ບໍ່ລວມໃນການກະທົບ (ບໍ່ຜ່ານບັນຊີ {ACCT_PRIZE_OUT}): ຍອດຖືກລາງວັນຂອງຜູ້ຂາຍອື່ນທີ່ບໍ່ແມ່ນ APP {fmt2(excluded.OTHER_USER)} (ທຸກກິດຈະກຳລວມກັນ)
            </p>
          </div>
        )}

        {/* Status filter + search */}
        {hasData && (
          <div className="no-print flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button key={s.key} onClick={() => { setStatusF(s.key); setPage(0); }}
                className={`px-3 py-1.5 text-xs rounded-full border transition ${statusF === s.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}>
                {s.label}{s.key !== "ALL" && ` (${sum.count[s.key as MatchStatus]})`}
              </button>
            ))}
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="ຄົ້ນຫາ ເລກບິນ / ງວດ / Ref"
              className="ml-auto px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64" />
          </div>
        )}

        {/* Print header */}
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold" }}>ກະທົບຍ່ອຍ ລາງວັນ CL — {activeLabel} — Statement {ACCT_PRIZE_OUT}</div>
          {(appliedFrom || appliedTo) && <div style={{ fontSize: "10px" }}>ວັນທີ: {appliedFrom} ຫາ {appliedTo}</div>}
          <div style={{ fontSize: "9px" }}>ພິມວັນທີ: {printTime} {user?.displayName ? `· ຜູ້ພິມ: ${user.displayName}` : ""}</div>
        </div>

        {/* Table */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <GitCompareArrows size={36} className="opacity-30" />
              <p className="text-sm">ເລືອກວັນທີ ແລ້ວກົດ <span className="font-semibold text-indigo-600">ສະແດງຂໍ້ມູນ</span></p>
            </div>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <GitCompareArrows size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນຕາມເງື່ອນໄຂທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>ລຳດັບ</th>
                    <th className={TH}>ກິດຈະກຳ</th>
                    <th className={TH}>ງວດ</th>
                    <th className={TH}>ວັນທີງວດ</th>
                    <th className={TH}>ເລກໃບບິນ</th>
                    <th className={TH}>ຍອດຖືກລາງວັນ<br />ໃນລະບົບ</th>
                    <th className={TH}>ຈ່າຍອອກ Statement<br />{ACCT_PRIZE_OUT}</th>
                    <th className={TH}>ຄ່າທຳນຽມ<br />(Statement)</th>
                    <th className={TH}>ອາກອນ<br />(Statement)</th>
                    <th className={TH}>ວັນທີຈ່າຍ</th>
                    <th className={TH}>ສ່ວນຕ່າງ</th>
                    <th className={TH}>ສະຖານະ</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r, i) => (
                    <tr key={`${r.BILL}-${i}`} className={r.STATUS === "MATCH" ? "hover:bg-blue-50" : "bg-amber-50 hover:bg-amber-100"}>
                      <td className={TDC}>{(printAll ? 0 : curPage * PAGE_SIZE) + i + 1}</td>
                      <td className={TDC}>{r.SVC === "OTHER" ? "-" : SVC_LABEL[r.SVC]}</td>
                      <td className={TDC}>{r.DRAWID}</td>
                      <td className={TDC}>{dayLabel(r.DRAWDATE)}</td>
                      <td className={TDC}>{r.BILL}</td>
                      <td className={TD}>{fmt2(r.SYS_AMT)}{r.POINT && <span className="ml-1 text-[10px] text-sky-600" title="ຊື້ດ້ວຍຄະແນນ (USEPOINTFLAG=1)">P</span>}</td>
                      <td className={TD}>{fmt2(r.BANK_AMT)}{r.BANK_CNT > 1 && <span className="ml-1 text-[10px] text-red-600">×{r.BANK_CNT}</span>}</td>
                      <td className={TD}>{fmt2(r.FEE_AMT)}</td>
                      <td className={TD}>{fmt2(r.TAX_AMT)}</td>
                      <td className={TDC}>{dayLabel(r.BANK_DATE)}</td>
                      <td className={TD + (isOff(r.DIFF) ? " text-red-600 font-bold bg-red-50" : "")}>{fmt2(r.DIFF)}</td>
                      <td className={TDC}>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${STATUS_CLS[r.STATUS]}`}>{STATUS_LABEL[r.STATUS]}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="grand-row">
                    <td className={GRAND + " text-center"} colSpan={5}>ລວມ{statusF !== "ALL" || q ? " (ຕາມທີ່ກອງ)" : "ທັງໝົດ"} · {shown.length.toLocaleString()} ບິນ</td>
                    <td className={GRAND}>{fmt2(shownSum.sysAmt)}</td>
                    <td className={GRAND}>{fmt2(shownSum.bankAmt)}</td>
                    <td className={GRAND}>{fmt2(shownSum.feeAmt)}</td>
                    <td className={GRAND}>{fmt2(shownSum.taxAmt)}</td>
                    <td className={GRAND}></td>
                    <td className={GRAND}>{fmt2(shownSum.diff)}</td>
                    <td className={GRAND}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {hasData && pages > 1 && (
          <div className="no-print flex items-center justify-center gap-3 text-xs text-slate-600">
            <button disabled={curPage === 0} onClick={() => setPage(curPage - 1)} className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">ກ່ອນໜ້າ</button>
            <span>ໜ້າ {curPage + 1} / {pages}</span>
            <button disabled={curPage >= pages - 1} onClick={() => setPage(curPage + 1)} className="px-3 py-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">ຖັດໄປ</button>
          </div>
        )}

        {/* Signatures (print) */}
        {hasData && (
          <div className="hidden print:flex justify-around mt-6">
            {SIGNERS.map((s) => (
              <div key={s} style={{ textAlign: "center", width: 160 }}>
                <div style={{ fontSize: 9, fontWeight: "bold" }}>{s}</div>
                <div style={{ marginTop: 40, borderTop: "1px solid #000", fontSize: 8 }}>( ........................ )</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

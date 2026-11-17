"use client";
// ─── ໜ້າລາຍງານ CL ແບບ generic — 4 ແຖບ: ສະຫລຸບ · ລາຍເດືອນ · ລາຍວັນ · ຕາມງວດ ─────────────
// ໃຊ້ຮ່ວມກັນລະຫວ່າງ "ອມພ+ອຄຊ" ແລະ "ອາກອນເງິນລາງວັນ" — ຕ່າງກັນພຽງ ReportDef
import React, { useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  AlertCircle,
  Calculator,
  Printer,
  X,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import { exportLottoReport } from "@/lib/ExportLottoReport";
import {
  SVC_LABEL,
  buildDaily,
  buildDraw,
  buildMonthly,
  fmtInt,
  monthLabel,
  dayLabel,
  toRawRows,
  type RawRow,
  type ReportDef,
  type SvcFilter,
  type Values,
} from "@/lib/lottoReportCore";
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
    tr.row-hl td { background: #ffff00 !important; font-weight: bold !important; }
    tr.row-grand td, tr.total-row td { background: #bfbfbf !important; font-weight: bold !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

type TabKey = "summary" | "monthly" | "daily" | "draw";
const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "ສະຫລຸບ" },
  { key: "monthly", label: "ລາຍເດືອນ" },
  { key: "daily", label: "ລາຍວັນ" },
  { key: "draw", label: "ຕາມງວດ" },
];

const TH =
  "px-2 py-2 text-center font-bold text-slate-700 bg-slate-200 border border-black text-[11px] whitespace-nowrap";
const TD = "px-2 py-1.5 text-right num border border-black text-[11px] whitespace-nowrap";
const TDL = "px-2 py-1.5 text-left border border-black text-[11px] whitespace-nowrap";
const TDC = "px-2 py-1.5 text-center border border-black text-[11px] whitespace-nowrap";

export default function LottoReportPage({ def }: { def: ReportDef }) {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [rows, setRows] = useState<RawRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");
  const [tab, setTab] = useState<TabKey>("summary");
  const [svc, setSvc] = useState<SvcFilter>("ALL");

  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ view: def.apiView, date_from: from, date_to: to });
      const res = await fetch(`/api/oracle/CL?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(toRawRows(def, Array.isArray(json.rows) ? json.rows : []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
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
    setError(null);
  };
  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportLottoReport(def, rows, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const monthly = useMemo(() => buildMonthly(def, rows), [def, rows]);
  const daily = useMemo(() => buildDaily(def, rows, svc), [def, rows, svc]);
  const draws = useMemo(() => buildDraw(def, rows, svc), [def, rows, svc]);

  const totalOf = (list: Values[]): Values => {
    const t: Values = {};
    for (const it of def.items) t[it.code] = list.reduce((a, v) => a + v[it.code], 0);
    return t;
  };
  const dailyTotal = useMemo(() => totalOf(daily.map((d) => d.v)), [daily]); // eslint-disable-line react-hooks/exhaustive-deps
  const drawTotal = useMemo(() => totalOf(draws.map((d) => d.v)), [draws]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasData = hasSearched && !loading && rows.length > 0;
  const activeLabel = TABS.find((t) => t.key === tab)!.label;
  const showSvc = tab === "daily" || tab === "draw";

  const rowClass = (hl?: boolean, grand?: boolean) =>
    grand ? "row-grand bg-slate-300 font-bold" : hl ? "row-hl bg-yellow-300 font-bold" : "bg-white";

  const headCells = (
    <>
      {def.items.map((it) => (
        <th key={it.code} className={TH}>
          [{it.code}] {it.label}
        </th>
      ))}
    </>
  );
  const valueCells = (v: Values) =>
    def.items.map((it) => (
      <td key={it.code} className={TD}>
        {fmtInt(v[it.code])}
      </td>
    ));

  const renderSummary = () => (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH}>ລຳດັບ</th>
          <th className={TH}>ເນື້ອໃນ</th>
          <th className={TH}>ສູດຄິດໄລ່</th>
          <th className={TH}>ຍອດລວມທັງໝົດ</th>
          <th className={TH}>{SVC_LABEL.DOG}</th>
          <th className={TH}>{SVC_LABEL.PUP}</th>
        </tr>
      </thead>
      <tbody>
        {def.items.map((it) => (
          <tr key={it.code} className={rowClass(it.highlight, it.grand)}>
            <td className={TDC}>[{it.code}]</td>
            <td className={TDL}>{it.label}</td>
            <td className={TDL}>{it.formula}</td>
            <td className={TD}>{fmtInt(monthly.grand[it.code])}</td>
            <td className={TD}>{fmtInt(monthly.dogTotal[it.code])}</td>
            <td className={TD}>{fmtInt(monthly.pupTotal[it.code])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderMonthly = () => {
    const n = monthly.months.length;
    return (
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th rowSpan={2} className={TH}>ລຳດັບ</th>
            <th rowSpan={2} className={TH}>ເນື້ອໃນ</th>
            <th rowSpan={2} className={TH}>ສູດຄິດໄລ່</th>
            <th rowSpan={2} className={TH}>ຍອດລວມທັງໝົດ</th>
            <th colSpan={n + 1} className={TH}>{SVC_LABEL.DOG}</th>
            <th colSpan={n + 1} className={TH}>{SVC_LABEL.PUP}</th>
          </tr>
          <tr>
            {(["DOG", "PUP"] as const).map((s) => (
              <React.Fragment key={s}>
                {monthly.months.map((m) => (
                  <th key={`${s}${m}`} className={TH}>{monthLabel(m)}</th>
                ))}
                <th className={TH}>ລວມທັງໝົດ</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {def.items.map((it) => (
            <tr key={it.code} className={rowClass(it.highlight, it.grand)}>
              <td className={TDC}>[{it.code}]</td>
              <td className={TDL}>{it.label}</td>
              <td className={TDL}>{it.formula}</td>
              <td className={TD}>{fmtInt(monthly.grand[it.code])}</td>
              {(["DOG", "PUP"] as const).map((s) => (
                <React.Fragment key={s}>
                  {monthly.byMonth.map((m) => (
                    <td key={`${s}${m.mon}`} className={TD}>{fmtInt(m[s][it.code])}</td>
                  ))}
                  <td className={TD}>
                    {fmtInt((s === "DOG" ? monthly.dogTotal : monthly.pupTotal)[it.code])}
                  </td>
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderDaily = () => (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH}>ວັນທີ</th>
          {headCells}
        </tr>
      </thead>
      <tbody>
        {daily.map((d) => (
          <tr key={d.day} className="bg-white hover:bg-blue-50">
            <td className={TDC}>{dayLabel(d.day)}</td>
            {valueCells(d.v)}
          </tr>
        ))}
        <tr className="total-row bg-slate-300 font-bold">
          <td className={TDC}>ລວມ</td>
          {valueCells(dailyTotal)}
        </tr>
      </tbody>
    </table>
  );

  const renderDraw = () => (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH}>ງວດ</th>
          <th className={TH}>ວັນທີ</th>
          <th className={TH}>ບໍລິການ</th>
          {headCells}
        </tr>
      </thead>
      <tbody>
        {draws.map((d) => (
          <tr key={`${d.svc}${d.drawId}`} className="bg-white hover:bg-blue-50">
            <td className={TDC}>{d.drawId}</td>
            <td className={TDC}>{dayLabel(d.day)}</td>
            <td className={TDL}>{SVC_LABEL[d.svc]}</td>
            {valueCells(d.v)}
          </tr>
        ))}
        <tr className="total-row bg-slate-300 font-bold">
          <td className={TDC} colSpan={3}>ລວມ ({draws.length.toLocaleString()} ງວດ)</td>
          {valueCells(drawTotal)}
        </tr>
      </tbody>
    </table>
  );

  const emptyMsg = (icon = true, text: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
      {icon && <Calculator size={36} className="opacity-30" />}
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
              <Calculator size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">{def.title} (CL)</h1>
              <p className="text-xs text-slate-400">
                CL_LOTTO_SELL · CL_LOTTO_REWARD · ນ້ອງໝານຳໂຊກ (11) ແລະ ປູປາເຕົ້າມະຫາໂຊກ (36)
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
                    <RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet size={13} /> Export Excel (4 sheet)
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
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (DRAWDATE)
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
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          ))}
          {showSvc && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">ບໍລິການ</label>
              <select
                value={svc}
                onChange={(e) => setSvc(e.target.value as SvcFilter)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                <option value="ALL">ທັງໝົດ</option>
                <option value="DOG">{SVC_LABEL.DOG}</option>
                <option value="PUP">{SVC_LABEL.PUP}</option>
              </select>
            </div>
          )}
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

        {/* Print header */}
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sokxay.png" alt="Logo" style={{ height: "44px", objectFit: "contain" }} />
          <p style={{ fontSize: "8px", margin: "2px 0" }}>
            ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            {user?.displayName ? ` · ຜູ້ພິມ: ${user.displayName}` : ""}
          </p>
          <h1 style={{ fontSize: "13px", fontWeight: "bold" }}>
            {def.title} — {activeLabel}
          </h1>
          <div style={{ fontSize: "10px" }}>
            ຈາກບໍລິການ &quot;{SVC_LABEL.DOG}&quot; ແລະ &quot;{SVC_LABEL.PUP}&quot; · ວັນທີ:{" "}
            {appliedFrom || "—"} ຫາ {appliedTo || "—"}
            {showSvc && svc !== "ALL" ? ` · ${SVC_LABEL[svc]}` : ""}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            emptyMsg(
              true,
              <>
                ເລືອກຊ່ວງວັນທີ ແລ້ວກົດ{" "}
                <span className="font-semibold text-amber-600">ສະແດງຂໍ້ມູນ</span>
              </>,
            )
          ) : rows.length === 0 ? (
            emptyMsg(true, "ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ")
          ) : (
            <div className="overflow-x-auto">
              {tab === "summary" && renderSummary()}
              {tab === "monthly" && renderMonthly()}
              {tab === "daily" && renderDaily()}
              {tab === "draw" && renderDraw()}
            </div>
          )}
        </div>

        {hasData && (tab === "daily" || tab === "draw") && (
          <p className="no-print text-xs text-slate-400">
            ໝາຍເຫດ: ແຖວ &ldquo;ລວມ&rdquo; ແມ່ນຜົນບວກຂອງແຕ່ລະແຖວ — ອາດຕ່າງຈາກລາຍເດືອນ/ສະຫລຸບ ໄດ້ເສດ ±1
            ກີບ ຍ້ອນອາກອນຄິດເປັນເປີເຊັນຕໍ່ໜຶ່ງ period.
          </p>
        )}
      </div>
    </>
  );
}

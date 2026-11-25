"use client";
// ─── ລາຍງານສະເຕັດເມັ້ນ ລວມຕາມສະກຸນເງິນ ແລະ ວັນທີ (CL) — ເລືອກເປັນເດືອນ ຫຼື ຊ່ວງວັນທີ ────────────────────────────
// ແຫຼ່ງຂໍ້ມູນ CL_BCEL_STMT + CL_BANK_ACCT · ແຕ່ລະສະກຸນເງິນ: ຍອດຍົກມາ · ເຄື່ອນໄຫວໜີ້ · ເຄື່ອນໄຫວມີ · ຍອດເຫຼືອທ້າຍ
import React, { useMemo, useState } from "react";
import { RefreshCw, Search, AlertCircle, AlertTriangle, CalendarDays, Printer, X, Filter, FileSpreadsheet } from "lucide-react";
import {
  NO_CCY, buildStmtDaily, datesBetween, dayLabel, fmt2, fmtInt, monthBounds, type StmtDailyApi,
} from "@/lib/clStmtDailyCore";
import { exportClStmtDaily } from "@/lib/ExportClStmtDaily";
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
    table { font-size: 8.5px !important; border-collapse: collapse !important; width: 100% !important; min-width: 0 !important; }
    th, td { padding: 1.5px 3px !important; border: 1px solid #000 !important; white-space: nowrap !important; }
    thead th, tr.green td { background: #92d050 !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

const GREEN = "bg-[#92D050]";
const TH = `px-2 py-1.5 text-center font-bold text-black ${GREEN} border border-black text-[12px] whitespace-nowrap`;
const TD = "px-2 py-1 text-right num border border-black text-[12px] whitespace-nowrap";
const TDC = "px-2 py-1 text-center border border-black text-[12px] whitespace-nowrap";
const SUBH = ["ຍອດຍົກມາ", "ເຄື່ອນໄຫວໜີ້", "ເຄື່ອນໄຫວມີ", "ຍອດເຫຼືອທ້າຍ"];

export default function ClStmtDailyReportPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"month" | "range">("month");
  const [month, setMonth] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null);
  const [api, setApi] = useState<StmtDailyApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");

  const MAX_DAYS = 366;
  const picked = useMemo(() => {
    if (mode === "month") return month ? monthBounds(month) : null;
    return dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null;
  }, [mode, month, dateFrom, dateTo]);
  const spanDays = picked ? (Date.parse(picked.to) - Date.parse(picked.from)) / 86400000 + 1 : 0;
  const rangeErr =
    mode === "range" && dateFrom && dateTo && dateFrom > dateTo
      ? "ວັນທີເລີ່ມຕົ້ນຕ້ອງບໍ່ເກີນວັນທີສິ້ນສຸດ"
      : spanDays > MAX_DAYS
        ? `ເລືອກຊ່ວງວັນທີໄດ້ບໍ່ເກີນ ${MAX_DAYS} ວັນ`
        : "";
  const canApply = !!picked && !rangeErr;

  const handleApply = async () => {
    if (!picked || !canApply) return;
    setApplied(picked);
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ date_from: picked.from, date_to: picked.to });
      const res = await fetch(`/api/oracle/CL_stmt_daily?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setApi({
        days: Array.isArray(json.days) ? json.days : [],
        prior: Array.isArray(json.prior) ? json.prior : [],
        accts: Array.isArray(json.accts) ? json.accts : [],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setApi(null);
    } finally {
      setLoading(false);
    }
  };
  const handleClear = () => {
    setMonth(""); setDateFrom(""); setDateTo(""); setApplied(null); setApi(null); setError(null);
  };
  const handlePrint = () => { setPrintTime(new Date().toLocaleString("lo-LA")); setTimeout(() => window.print(), 100); };

  const res = useMemo(
    () => (api && applied ? buildStmtDaily(api, datesBetween(applied.from, applied.to)) : null),
    [api, applied],
  );
  const hasData = !!res && !loading && res.ccys.length > 0;

  const handleExport = async () => {
    if (!res || !applied) return;
    setExporting(true);
    try {
      exportClStmtDaily(res, applied.from, applied.to);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const n = res?.ccys.length ?? 0;
  const dateW = 9;
  const numW = n ? (100 - dateW) / (n * 4) : 0;

  const emptyMsg = (text: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
      <CalendarDays size={36} className="opacity-30" />
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
            <div className="w-9 h-9 rounded-xl bg-lime-100 flex items-center justify-center">
              <CalendarDays size={18} className="text-lime-700" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານສະເຕັດເມັ້ນ ລວມຕາມສະກຸນເງິນ ແລະ ວັນທີ (CL)</h1>
              <p className="text-xs text-slate-400">CL_BCEL_STMT + CL_BANK_ACCT · ເລືອກເປັນເດືອນ ຫຼື ຊ່ວງວັນທີ · ແຕ່ລະວັນລວມທຸກບັນຊີຂອງສະກຸນເງິນດຽວກັນ</p>
            </div>
          </div>
          {hasData && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
              >
                {exporting ? (<><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</>) : (<><FileSpreadsheet size={13} /> Export Excel</>)}
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="no-print bg-lime-50 border border-lime-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-lime-800 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (BANK_DATE)
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ເລືອກຕາມ</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-300 bg-white text-xs font-medium">
              {([["month", "ເດືອນ"], ["range", "ຊ່ວງວັນທີ"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMode(k)}
                  className={`px-3 py-2 transition ${mode === k ? "bg-lime-600 text-white" : "text-slate-600 hover:bg-lime-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {mode === "month" ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">ເດືອນ</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-white"
              />
            </div>
          ) : (
            [
              { label: "ວັນທີ ຈາກ", v: dateFrom, set: setDateFrom },
              { label: "ວັນທີ ຫາ", v: dateTo, set: setDateTo },
            ].map((f) => (
              <div key={f.label} className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">{f.label}</label>
                <input
                  type="date"
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 bg-white"
                />
              </div>
            ))
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading || !canApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-lime-600 text-white hover:bg-lime-700 disabled:opacity-40 transition"
            >
              {loading ? (<><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>) : (<><Search size={13} /> ສະແດງຂໍ້ມູນ</>)}
            </button>
            {(month || dateFrom || dateTo || applied) && (
              <button onClick={handleClear} className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງ
              </button>
            )}
          </div>
          {rangeErr && <p className="w-full text-xs text-red-600">{rangeErr}</p>}
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

        {hasData && res && (res.unknownAccts.length > 0 || res.multi > 0 || res.breaks > 0 || Object.values(res.summary).some((s) => s.bad)) && (
          <div className="no-print flex flex-col gap-1.5">
            {res.unknownAccts.length > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>ບັນຊີທີ່ບໍ່ມີໃນ CL_BANK_ACCT ຫຼື CURENCY ຫວ່າງ: {res.unknownAccts.join(", ")} — ຈັດໃສ່ກຸ່ມ “{NO_CCY}”</p>
              </div>
            )}
            {res.multi > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>ພົບ {res.multi} ວັນ-ບັນຊີ ທີ່ຫາຍອດຕົ້ນ/ທ້າຍວັນຈາກ BANK_ENDING_BALANCE ບໍ່ໄດ້ຊັດເຈນ ຫຼື ຂໍ້ມູນຕໍ່ໂສ້ບໍ່ສອດຄ່ອງ — ກວດຂໍ້ມູນລາຍການຂອງວັນນັ້ນ</p>
              </div>
            )}
            {(res.breaks > 0 || Object.values(res.summary).some((s) => s.bad)) && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>ຍອດຍົກມາຂອງບາງວັນ (ສີແດງ) ບໍ່ຕໍ່ເນື່ອງກັບຍອດເຫຼືອທ້າຍຂອງວັນກ່ອນ — ອາດມີວັນທີ່ຂາດ ຫຼືຂໍ້ມູນບໍ່ຄົບ</p>
              </div>
            )}
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
        </div>

        {loading ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          </div>
        ) : !applied ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            {emptyMsg(<>ເລືອກເດືອນ ຫຼື ຊ່ວງວັນທີ ແລ້ວກົດ <span className="font-semibold text-lime-700">ສະແດງຂໍ້ມູນ</span></>)}
          </div>
        ) : !res || res.ccys.length === 0 ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">{emptyMsg("ບໍ່ມີຂໍ້ມູນ")}</div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-800">ລາຍງານການເຄື່ອນໄຫວບັນຊີ ບໍລິສັດ ຊິແອວ ແຊ່ງໝາຈຳກັດ</h2>
              <p className="text-sm font-bold text-slate-800">(ລາຍງານລວມຕາມສະກຸນເງິນ ແລະ ວັນທີ)</p>
              <p className="text-sm font-bold text-slate-800">ແຕ່ວັນທີ {dayLabel(applied!.from)} - {dayLabel(applied!.to)}</p>
            </div>

            <div className="bg-white overflow-x-auto">
              <table className="w-full border-collapse table-fixed" style={{ minWidth: 120 + n * 4 * 120 }}>
                <colgroup>
                  <col style={{ width: `${dateW}%` }} />
                  {Array.from({ length: n * 4 }, (_, i) => (<col key={i} style={{ width: `${numW}%` }} />))}
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className={TH}>ວັນທີ</th>
                    {res.ccys.map((c) => (<th key={c} colSpan={4} className={TH}>{c}</th>))}
                  </tr>
                  <tr>
                    {res.ccys.flatMap((c) => SUBH.map((h) => (<th key={c + h} className={TH}>{h}</th>)))}
                  </tr>
                </thead>
                <tbody>
                  {res.lines.map((ln) => (
                    <tr key={ln.date} className="bg-white hover:bg-blue-50">
                      <td className={TDC}>{dayLabel(ln.date)}</td>
                      {res.ccys.flatMap((c) => {
                        const x = ln.cells[c];
                        return [
                          <td key={c + "o"} className={`${TD} ${x.brk ? "text-red-600 font-bold bg-red-50" : ""}`}>{fmt2(x.open)}</td>,
                          <td key={c + "d"} className={TD}>{x.dr ? fmt2(x.dr) : "-"}</td>,
                          <td key={c + "c"} className={TD}>{x.cr ? fmt2(x.cr) : "-"}</td>,
                          <td key={c + "e"} className={TD}>{fmt2(x.close)}</td>,
                        ];
                      })}
                    </tr>
                  ))}
                  {([
                    { label: "ຍອດຍົກມາ:", key: "open", green: true, count: null },
                    { label: "ລວມຍອດເຄື່ອນໄຫວເບື້ອງໜີ້:", key: "dr", green: false, count: "nDr" },
                    { label: "ລວມຍອດເຄື່ອນໄຫວເບື້ອງມີ:", key: "cr", green: false, count: "nCr" },
                    { label: "ຍອດເຫຼືອທ້າຍ:", key: "close", green: true, count: null },
                  ] as const).map((f) => (
                    <tr key={f.key} className={f.green ? "green" : ""}>
                      <td className="border-0 bg-white" />
                      {res.ccys.flatMap((c) => {
                        const bad = f.key === "close" && res.summary[c].bad;
                        const bg = f.green ? GREEN : "bg-white";
                        const cells = [
                          <td key={c + "l"} colSpan={2} className={`px-2 py-1 text-right font-bold border border-black text-[12px] whitespace-nowrap ${bg}`}>{f.label}</td>,
                        ];
                        cells.push(
                          <td key={c + "n"} className={`px-2 py-1 text-center font-bold num border border-black text-[12px] whitespace-nowrap ${bg}`} title={f.count ? "ຈຳນວນລາຍການ" : undefined}>
                            {f.count ? fmtInt(res.summary[c][f.count]) : ""}
                          </td>,
                        );
                        cells.push(
                          <td key={c + "v"} className={`px-2 py-1 text-right font-bold num border border-black text-[12px] whitespace-nowrap ${bg} ${bad ? "text-red-600" : ""}`}>{fmt2(res.summary[c][f.key])}</td>,
                        );
                        return cells;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-4 gap-4 pt-6 text-center signature-block" style={{ pageBreakInside: "avoid" }}>
              {SIGNERS.map((t) => (
                <div key={t}>
                  <p className="text-xs font-bold underline">{t}</p>
                  <div style={{ height: "56px" }} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

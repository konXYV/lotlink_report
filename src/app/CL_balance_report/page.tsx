"use client";
// ─── ລາຍງານຍອດຍົກມາ (CL) : ຍອດຍົກມາ · ເຄື່ອນໄຫວໜີ້/ມີ · ຍອດເຫຼືອທ້າຍ — ແຍກສະກຸນເງິນ ແລະ ເລກບັນຊີ ───
// ແຫຼ່ງຂໍ້ມູນ CL_BCEL_STMT_SUM · ເລືອກຊ່ວງວັນທີ ຈາກ — ຫາ
import React, { useMemo, useState } from "react";
import { RefreshCw, Search, AlertCircle, AlertTriangle, Wallet, Printer, X, Filter, FileSpreadsheet } from "lucide-react";
import {
  NO_CCY, buildBalance, dayLabel, fmt2, isOff, toBalanceRows, type BalanceRaw,
} from "@/lib/clBalanceCore";
import { exportClBalance } from "@/lib/ExportClBalance";
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
    table { font-size: 9px !important; border-collapse: collapse !important; width: 100% !important; }
    th, td { padding: 2px 4px !important; border: 1px solid #000 !important; white-space: nowrap !important; }
    thead th { background: #548235 !important; color: #fff !important; }
    tr.sub-row td { background: #e7e6e6 !important; font-weight: bold !important; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .ccy-block { page-break-inside: avoid; }
  }
`;

// ຄວາມກວ້າງຄໍລຳຄົງທີ່ ໃຊ້ຮ່ວມກັນທຸກສະກຸນເງິນ → ຖັນຕົງກັນໝົດ (ລວມ 100%)
const COL_W = ["6%", "19%", "9%", "9%", "14.25%", "14.25%", "14.25%", "14.25%"];

const TH = "px-2 py-2 text-center font-bold text-white bg-[#548235] border border-black text-[12px] whitespace-nowrap";
const TD = "px-2 py-1.5 text-right num border border-black text-[12px] whitespace-nowrap";
const TDC = "px-2 py-1.5 text-center border border-black text-[12px] whitespace-nowrap";
const TDL = "px-2 py-1.5 text-left border border-black text-[12px] whitespace-nowrap";
const SUB = "px-2 py-1.5 text-right num border border-black text-[12px] whitespace-nowrap bg-[#e7e6e6] font-bold";

export default function ClBalanceReportPage() {
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [rows, setRows] = useState<BalanceRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");

  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ date_from: from, date_to: to });
      const res = await fetch(`/api/oracle/CL_balance?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(toBalanceRows(Array.isArray(json.rows) ? json.rows : []));
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
      await exportClBalance(rows, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const sections = useMemo(() => buildBalance(rows), [rows]);
  const hasData = hasSearched && !loading && rows.length > 0;
  const noMoveCount = useMemo(
    () => sections.reduce((a, s) => a + s.lines.filter((l) => !l.hasMove).length, 0),
    [sections],
  );
  const mismatchCount = useMemo(
    () => sections.reduce((a, s) => a + s.lines.filter((l) => l.hasMove && isOff(l.diff)).length, 0),
    [sections],
  );
  const multiCount = useMemo(() => rows.reduce((a, r) => a + r.MULTI, 0), [rows]);
  const unknown = sections.find((s) => s.ccy === NO_CCY);

  const emptyMsg = (text: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
      <Wallet size={36} className="opacity-30" />
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
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານຍອດຍົກມາ ແຍກບັນຊີ ແລະ ສະກຸນເງິນ (CL)</h1>
              <p className="text-xs text-slate-400">CL_BCEL_STMT_SUM + CL_BANK_ACCT · ຍອດຍົກມາ · ເຄື່ອນໄຫວໜີ້/ມີ · ຍອດເຫຼືອທ້າຍ</p>
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

        {/* Filter */}
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (BANK_DATE) — ຍອດຍົກມາ = ຍອດ ກ່ອນເລີ່ມວັນທີ “ຈາກ”
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

        {hasData && (unknown || mismatchCount > 0 || noMoveCount > 0 || multiCount > 0) && (
          <div className="no-print flex flex-col gap-1.5">
            {unknown && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  ພົບບັນຊີທີ່ບໍ່ມີໃນ CL_BANK_ACCT ຫຼື CURENCY ຫວ່າງ {unknown.lines.length} ບັນຊີ ({unknown.lines.map((l) => l.acct).join(", ")}) —
                  ເພີ່ມ/ແກ້ໃນ CL_BANK_ACCT
                </p>
              </div>
            )}
            {multiCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  ພົບ {multiCount} ວັນ-ບັນຊີ ທີ່ SOLD ຫຼື BALANCE ບໍ່ເທົ່າກັນລະຫວ່າງ TXN_TYPE ໃນວັນດຽວ — ຍອດຍົກມາ/ເຫຼືອທ້າຍ ອາດບໍ່ຖືກ, ກວດການຄຳນວນ BALANCE ໃນຕາຕະລາງ
                </p>
              </div>
            )}
            {mismatchCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  {mismatchCount} ບັນຊີ ຍອດຍົກມາ − ໜີ້ + ມີ ບໍ່ເທົ່າຍອດເຫຼືອທ້າຍ (ແຖວທີ່ໝາຍສີແດງ) — ກວດຂໍ້ມູນວັນທີ່ຂາດ/ຊໍ້າ
                </p>
              </div>
            )}
            {noMoveCount > 0 && (
              <p className="text-xs text-slate-500 px-1">
                {noMoveCount} ບັນຊີ ບໍ່ມີເຄື່ອນໄຫວໃນຊ່ວງນີ້ — ສະແດງຍອດຍົກມາ = ຍອດເຫຼືອທ້າຍ (ຍອດສຸດທ້າຍກ່ອນຊ່ວງ)
              </p>
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
        ) : !hasSearched ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            {emptyMsg(<>ເລືອກຊ່ວງວັນທີ ແລ້ວກົດ <span className="font-semibold text-emerald-600">ສະແດງຂໍ້ມູນ</span></>)}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-black rounded-xl overflow-hidden">
            {emptyMsg("ບໍ່ມີຂໍ້ມູນໃນ CL_BCEL_STMT_SUM")}
          </div>
        ) : (
          <>
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-800">ລາຍງານການເຄື່ອນໄຫວບັນຊີ ບໍລິສັດ ຊິແອວ ແຊ່ງໝາຈຳກັດ</h2>
              <p className="text-sm font-bold text-slate-800">
                ແຕ່ວັນທີ {dayLabel(appliedFrom)} - {dayLabel(appliedTo)}
              </p>
            </div>

            {sections.map((s) => (
              <div key={s.ccy} className="ccy-block flex flex-col gap-1.5">
                <p className="text-sm font-bold text-[#1F3864]">{s.title}</p>
                <div className="bg-white border border-black overflow-x-auto">
                  <table className="w-full border-collapse table-fixed" style={{ minWidth: 960 }}>
                    <colgroup>
                      {COL_W.map((w, i) => (
                        <col key={i} style={{ width: w }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={TH}>ລຳດັບ</th>
                        <th className={TH}>ເລກບັນຊີ</th>
                        <th className={TH}>ທະນາຄານ</th>
                        <th className={TH}>ສະກຸນເງິນ</th>
                        <th className={TH}>ຍອດຍົກມາ</th>
                        <th className={TH}>ເຄື່ອນໄຫວໜີ້</th>
                        <th className={TH}>ເຄື່ອນໄຫວມີ</th>
                        <th className={TH}>ຍອດເຫຼືອທ້າຍ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.lines.map((l) => {
                        const bad = l.hasMove && isOff(l.diff);
                        return (
                          <tr key={l.acct} className="bg-white hover:bg-blue-50">
                            <td className={TDC}>{l.no}</td>
                            <td className={TDL}>
                              {l.acct}
                              {l.note && <span className="no-print block text-[10px] text-slate-400 truncate" title={l.note}>{l.note}</span>}
                            </td>
                            <td className={TDC}>{l.bank || "—"}</td>
                            <td className={TDC}>{l.ccy}</td>
                            <td className={TD}>{fmt2(l.open)}</td>
                            <td className={TD}>{l.hasMove ? fmt2(l.dr) : "-"}</td>
                            <td className={TD}>{l.hasMove ? fmt2(l.cr) : "-"}</td>
                            <td
                              className={`${TD} ${bad ? "text-red-600 font-bold bg-red-50" : ""}`}
                              title={bad ? `ສ່ວນຕ່າງ ${fmt2(l.diff)}` : undefined}
                            >
                              {fmt2(l.close)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="sub-row">
                        <td colSpan={4} className={`${SUB} text-center`}>ລວມ {s.ccy === NO_CCY ? "" : s.ccy}</td>
                        <td className={SUB}>{fmt2(s.total.open)}</td>
                        <td className={SUB}>{s.total.dr ? fmt2(s.total.dr) : "-"}</td>
                        <td className={SUB}>{s.total.cr ? fmt2(s.total.cr) : "-"}</td>
                        <td className={SUB}>{fmt2(s.total.close)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* ລາຍເຊັນ 4 ຊ່ອງ */}
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

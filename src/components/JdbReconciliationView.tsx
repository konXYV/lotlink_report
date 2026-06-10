"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw, Search, AlertCircle, GitCompareArrows,
  Printer, X, Filter, TrendingDown, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";

// ─── Row type ─────────────────────────────────────────────────────────────────
export interface JdbReconRow {
  "ວັນທີ":               string | null;
  "ລວມໜີ້":              string;
  "ລວມມີ":               string;
  "SPLUS_PRICE":         string;
  "FEE_SPLUS_PRICE":     string;
  "SPLUS_PRO":           string;
  "SPLUS_REFUND":        string;
  "FEE_SPLUS_REFUND":    string;
  "LOTTO_SELL":          string;
  "TRANSFER":            string;
  "TRANSFER_CR":         string;
  "ATT":                 string;
  "IBANK_FEE":           string;
  "FTR_FEE":             string;
  "TRANSFER_FEE":        string;
  "FEE_JDB_LOTTO_SETTL": string;
  "SAVING_INTEREST":     string;
  "SPLUS_PRICE_TAX":     string;
  "ອື່ນໆ":               string | null;
  "ສ່ວນຕ່າງ":            string;
}

type ColKey = keyof JdbReconRow;

const COLS: { key: ColKey; label: string; align?: "left" | "right" | "center"; dir?: "cr" }[] = [
  { key: "ວັນທີ",               label: "ວັນທີ",                 align: "center" },
  { key: "ລວມໜີ້",              label: "ລວມໜີ້",                align: "right" },
  { key: "ລວມມີ",               label: "ລວມມີ",                 align: "right",  dir: "cr" },
  { key: "SPLUS_PRICE",         label: "ລາງວັນ Sokxay",         align: "right" },
  { key: "FEE_SPLUS_PRICE",     label: "ຄ່າທໍານຽມ Sokxay",      align: "right" },
  { key: "SPLUS_PRO",           label: "ໂຊກຊ້ອນໂຊກ",            align: "right" },
  { key: "SPLUS_REFUND",        label: "Refund Sokxay",         align: "right" },
  { key: "FEE_SPLUS_REFUND",    label: "ຄ່າທໍານຽມ Refund",      align: "right" },
  { key: "LOTTO_SELL",          label: "ຂາຍຫວຍ (Cr)",           align: "right",  dir: "cr" },
  { key: "TRANSFER",            label: "ໂອນ-ໜີ້",               align: "right" },
  { key: "TRANSFER_CR",         label: "ໂອນ-ມີ",                align: "right",  dir: "cr" },
  { key: "ATT",                 label: "ATT",                   align: "right" },
  { key: "IBANK_FEE",           label: "iBank Fee",             align: "right" },
  { key: "FTR_FEE",             label: "FTR Fee",               align: "right" },
  { key: "TRANSFER_FEE",        label: "Transfer Fee",          align: "right" },
  { key: "FEE_JDB_LOTTO_SETTL", label: "Fee Lotto Settl",       align: "right" },
  { key: "SAVING_INTEREST",     label: "Saving Interest (Cr)",  align: "right",  dir: "cr" },
  { key: "SPLUS_PRICE_TAX",     label: "ອາກອນ 5% (Cr)",         align: "right",  dir: "cr" },
  { key: "ອື່ນໆ",               label: "ອື່ນໆ",                  align: "left" },
  { key: "ສ່ວນຕ່າງ",            label: "ສ່ວນຕ່າງ",              align: "right" },
];

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
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 100%; margin: 0; padding: 0; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 277mm; overflow: visible; padding: 0; box-sizing: border-box; }
    .no-print { display: none !important; }
    * { font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important; color: #000 !important; box-shadow: none !important; text-shadow: none !important; border-radius: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td.num { font-family: 'Arial Narrow', Arial, sans-serif !important; font-stretch: condensed !important; }
    .print-area > div { border-radius: 0 !important; overflow: visible !important; box-shadow: none !important; border: none !important; background: #fff !important; background-color: #fff !important; }
    .overflow-x-auto { overflow: visible !important; width: 277mm !important; }
    table { font-size: 7.5px !important; width: 277mm !important; max-width: 277mm !important; table-layout: auto !important; border-collapse: collapse !important; border: 1px solid #000 !important; box-shadow: none !important; background: #fff !important; }
    th, td { padding: 2px 2px !important; font-size: 7.5px !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; border: 1px solid #000 !important; color: #000 !important; background: #fff !important; background-color: #fff !important; box-shadow: none !important; }
    tbody tr td,
    tbody tr.bg-amber-50 td,
    tbody tr.bg-amber-100 td,
    tbody tr.hover\\:bg-amber-100 td,
    tbody tr.hover\\:bg-blue-50 td { background: #fff !important; background-color: #fff !important; }
    thead tr th, thead th { background: #9DC3E6 !important; background-color: #9DC3E6 !important; font-weight: bold !important; text-align: center !important; color: #000 !important; }
    tr.total-row td { background: #d0d0d0 !important; background-color: #d0d0d0 !important; font-weight: bold !important; font-size: 8.5px !important; padding: 3px 2px !important; }
    thead { display: table-header-group; }
    tfoot  { display: table-footer-group; }
    tr { page-break-inside: avoid; }
    .print-signature { display: flex !important; justify-content: space-around; margin-top: 14mm; page-break-inside: avoid; }
    .print-signature .sig-box { text-align: center; width: 160px; }
    .print-signature .sig-line { border-top: 1px solid #000 !important; margin-top: 12mm; padding-top: 4px; font-size: 9px; }
    .print-signature .sig-role { font-size: 8px; margin-top: 2px; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isGrandTotal = (r: JdbReconRow) => r["ວັນທີ"] == null || r["ວັນທີ"] === "";

const parseN = (v: string | number | null | undefined): number => {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const neg = s.startsWith("-");
  return (neg ? -1 : 1) * (parseFloat(s.replace(/,/g, "").replace(/^-/, "")) || 0);
};

const fmtVal = (v: string | number | null | undefined): string => {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  if (s === "0.00" || s === "-0.00" || s === "0") return "";
  return s;
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  acct: string;          // "02920020000003191" | "02920020000003180"
  acctLabel: string;     // ສຳລັບ header ໃນ screen ແລະ print
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function JdbReconciliationView({ acct, acctLabel }: Props) {
  const { user } = useAuth();

  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo,   setDateTo]       = useState("");
  const [rows,     setRows]         = useState<JdbReconRow[]>([]);
  const [loading,  setLoading]      = useState(false);
  const [error,    setError]        = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [printTime,   setPrintTime]   = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ view: "jdb_bank_reconciliation", acct });
      if (from) qs.set("date_from", from);
      if (to)   qs.set("date_to",   to);
      const res  = await fetch(`/api/oracle?${qs}`);
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
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setHasSearched(true);
    fetchData(dateFrom, dateTo);
  };

  const handleClear = () => {
    setDateFrom(""); setDateTo("");
    setAppliedFrom(""); setAppliedTo("");
    setHasSearched(false);
    setRows([]); setError(null);
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const dataRows = useMemo(() => rows.filter((r) => !isGrandTotal(r)), [rows]);
  const totalRow = useMemo(() => rows.find((r)  =>  isGrandTotal(r)), [rows]);
  const hasData  = hasSearched && dataRows.length > 0;
  const hasFilter = dateFrom || dateTo;

  const stats = useMemo(() => {
    if (!totalRow) return null;
    return {
      debit:  parseN(totalRow["ລວມໜີ້"]),
      credit: parseN(totalRow["ລວມມີ"]),
      diff:   parseN(totalRow["ສ່ວນຕ່າງ"]),
    };
  }, [totalRow]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Style constants ────────────────────────────────────────────────────────
  const TH  = "px-2 py-2 text-center font-bold text-slate-700 bg-blue-100 border border-black text-[10px] whitespace-nowrap";
  const TD  = "px-2 py-1.5 text-right  num border border-black text-[10px] whitespace-nowrap";
  const TDC = "px-2 py-1.5 text-center num border border-black text-[10px] whitespace-nowrap";
  const TDL = "px-2 py-1.5 text-left   num border border-black text-[10px] max-w-[180px] overflow-hidden text-ellipsis";

  const cellClass = (col: typeof COLS[number]) => {
    if (col.align === "left")   return TDL;
    if (col.align === "center") return TDC;
    return TD;
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* ── Screen Header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <GitCompareArrows size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                Bank Reconciliation JDB — {acctLabel}
              </h1>
              <p className="text-xs text-slate-400">JDB_STMT · {acct} · ຈຳແນກຕາມວັນທີ (BANK_TXN_DATE)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
              >
                <Printer size={13} /> ພິມ A4
              </button>
            )}
          </div>
        </div>

        {/* ── Filter ────────────────────────────────────────────────────── */}
        <div className="no-print bg-violet-50 border border-violet-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-violet-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ (BANK_TXN_DATE)
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈາກ</label>
            <input
              type="date" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onInput={(e)  => setDateFrom((e.target as HTMLInputElement).value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຫາ</label>
            <input
              type="date" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onInput={(e)  => setDateTo((e.target as HTMLInputElement).value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApply} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition"
            >
              {loading
                ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
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
                {loading ? "ກໍາລັງດຶງ..." : `${dataRows.length.toLocaleString()} ວັນ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        {hasData && stats && (
          <div className="no-print grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown size={16} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-500 font-medium">ລວມໜີ້ (Debit)</p>
                <p className="text-sm font-bold text-red-700 font-mono">{fmt(stats.debit)}</p>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-emerald-500 font-medium">ລວມມີ (Credit)</p>
                <p className="text-sm font-bold text-emerald-700 font-mono">{fmt(stats.credit)}</p>
              </div>
            </div>
            <div className={`border rounded-xl p-3 flex items-center gap-3 ${Math.abs(stats.diff) < 0.01 ? "bg-slate-50 border-slate-200" : "bg-amber-50 border-amber-300"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${Math.abs(stats.diff) < 0.01 ? "bg-slate-100" : "bg-amber-100"}`}>
                <GitCompareArrows size={16} className={Math.abs(stats.diff) < 0.01 ? "text-slate-500" : "text-amber-600"} />
              </div>
              <div>
                <p className={`text-xs font-medium ${Math.abs(stats.diff) < 0.01 ? "text-slate-500" : "text-amber-600"}`}>
                  ສ່ວນຕ່າງ (Diff)
                </p>
                <p className={`text-sm font-bold font-mono ${Math.abs(stats.diff) < 0.01 ? "text-slate-700" : "text-amber-700"}`}>
                  {fmt(stats.diff)}
                  {Math.abs(stats.diff) < 0.01 && (
                    <span className="ml-1 text-xs text-emerald-600"
                      style={{ fontFamily: "'Noto Sans Lao', 'Inter', sans-serif", fontWeight: "normal" }}>
                      ✓ ສົມດູນ
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print header ──────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sokxay.png" alt="Logo" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
            <p style={{ fontSize: "8px", color: "#888", margin: "2px 0 0 2px" }}>
              ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            </p>
            {user?.displayName && (
              <p style={{ fontSize: "9px", color: "#888", margin: "1px 0 0 2px", whiteSpace: "nowrap" }}>
                ຜູ້ພິມ: {user.displayName}
              </p>
            )}
          </div>
        </div>
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "12px", fontWeight: "bold" }}>ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</div>
          <div style={{ fontSize: "10px" }}>ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ</div>
          <h1 style={{ fontSize: "13px", fontWeight: "bold", margin: "4px 0 0 0" }}>
            Bank Reconciliation JDB ({acctLabel}) — {acct}
          </h1>
          {(appliedFrom || appliedTo) && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ວັນທີ: {appliedFrom || "—"} ຫາ {appliedTo || "—"}
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
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
                ເລືອກວັນທີ ແລ້ວກົດ{" "}
                <span className="font-semibold text-violet-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : dataRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <GitCompareArrows size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>ລຳດັບ</th>
                    {COLS.map((c) => (
                      <th key={String(c.key)} className={TH}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, i) => {
                    const diffVal = parseN(row["ສ່ວນຕ່າງ"]);
                    const hasDiff = Math.abs(diffVal) >= 0.01;
                    return (
                      <tr
                        key={i}
                        className={hasDiff ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-blue-50"}
                      >
                        <td className={TDC}>{i + 1}</td>
                        {COLS.map((col) => {
                          const val     = row[col.key];
                          const display = fmtVal(val);

                          if (col.key === "ສ່ວນຕ່າງ" && hasDiff)
                            return <td key={String(col.key)} className={TD + " text-amber-700 font-bold"}>{display}</td>;
                          if (col.key === "ລວມໜີ້" && display)
                            return <td key={String(col.key)} className={TD + " text-red-700"}>{display}</td>;
                          if ((col.key === "ລວມມີ" || col.dir === "cr") && display)
                            return <td key={String(col.key)} className={cellClass(col) + " text-emerald-600"}>{display}</td>;

                          return (
                            <td key={String(col.key)} className={cellClass(col)}>
                              {display ?? ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Total row */}
                  {totalRow && (
                    <tr className="total-row bg-gray-200 font-bold">
                      <td
                        className={TDC + " bg-gray-200 font-bold"}
                        colSpan={2}
                        style={{ fontFamily: "'Noto Sans Lao', 'Phetsarath OT', sans-serif" }}
                      >
                        ລວມທັງໝົດ
                      </td>
                      {COLS.slice(1).map((col) => {
                        const val = totalRow[col.key];
                        const display = fmtVal(val);
                        return (
                          <td key={String(col.key)} className={cellClass(col) + " bg-gray-200 font-bold"}>
                            {display ?? ""}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Signature (print only) ────────────────────────────────────── */}
        {hasData && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສ້າງ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ກວດສອບ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ອະນຸມັດ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
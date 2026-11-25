"use client";
// ─── ຕາຕະລາງຄິດໄລ່ ອມພ, ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ — ປະຈຳເດືອນ ───
// ເລືອກເດືອນ → ດຶງ ຍອດຂາຍ / ຍອດຈ່າຍລາງວັນ ຂອງ ນ້ອງໝານຳໂຊກ ແລະ ປູປາເຕົ້າມະຫາໂຊກ → ຄິດໄລ່ຕາມສູດຂອງຫົວໜ້າ
// ໜ້າໃໝ່ ແຍກຕ່າງຫາກ — ບໍ່ກະທົບໜ້າ/ລາຍງານອື່ນ
import React, { useMemo, useState } from "react";
import { RefreshCw, Search, AlertCircle, Calculator, Printer, FileSpreadsheet, Eye, EyeOff } from "lucide-react";
import {
  DEFAULT_INCOME_TAX, LINES, calcAll, fmt0, monthLabel, todayLabel, type TaxMonthlyRaw,
} from "@/lib/clTaxMonthlyCore";
import { exportClTaxMonthly } from "@/lib/ExportClTaxMonthly";
import { FONT_CSS } from "@/lib/clXlsxCommon";

const PRINT_CSS = `
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100%; }
    .no-print { display: none !important; }
    * { font-family: "CLMix", 'Phetsarath OT', 'Phetsarath', 'Arial Narrow', sans-serif !important; box-shadow: none !important; }
    table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; }
    th, td { border: 1px solid #000 !important; padding: 4px 6px !important; }
    thead th { background: #375623 !important; color: #fff !important; }
    .hi-cell { background: #ffc000 !important; }
  }
`;

const prevMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const TH = "px-3 py-2 text-center font-semibold text-white bg-[#375623] border border-black text-sm";
const BD = "border border-black px-3 py-2 text-sm";

export default function ClTaxMonthlyPage() {
  const [month, setMonth] = useState(prevMonth());
  const [applied, setApplied] = useState("");
  const [raw, setRaw] = useState<TaxMonthlyRaw | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomeTax, setIncomeTax] = useState<number>(DEFAULT_INCOME_TAX);
  const [showFormula, setShowFormula] = useState(false);

  const load = async () => {
    if (!month) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/oracle/CL_tax_monthly?${new URLSearchParams({ month })}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRaw(json as TaxMonthlyRaw);
      setApplied(month);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setRaw(null);
    } finally {
      setLoading(false);
    }
  };

  const r = useMemo(() => (raw ? calcAll(raw, incomeTax) : null), [raw, incomeTax]);

  return (
    <>
      <style>{PRINT_CSS}</style>
      <style>{FONT_CSS}</style>
      <div className="print-area cl-font flex flex-col gap-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Calculator size={18} className="text-emerald-700" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ຕາຕະລາງຄິດໄລ່ ອມພ , ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ</h1>
              <p className="text-xs text-slate-400">ປະຈຳເດືອນ · ບໍລິສັດ ຊີແອວ ແຂ່ງໝາຈຳກັດ</p>
            </div>
          </div>
          {r && (
            <div className="flex items-center gap-2">
              <button onClick={() => exportClTaxMonthly(raw!, applied, incomeTax)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
                <FileSpreadsheet size={13} /> Export Excel
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            </div>
          )}
        </div>

        {/* ຕົວເລືອກເດືອນ */}
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ເລືອກເດືອນ</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ (ແກ້ໄຂໄດ້)</label>
            <input type="number" value={incomeTax} min={0} onChange={(e) => setIncomeTax(Number(e.target.value) || 0)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-48 text-right" />
          </div>
          <button onClick={load} disabled={loading || !month}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
            {loading ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</> : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
          </button>
          {r && (
            <button onClick={() => setShowFormula((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-300 text-slate-600 hover:bg-white transition">
              {showFormula ? <EyeOff size={13} /> : <Eye size={13} />} {showFormula ? "ເຊື່ອງສູດ" : "ສະແດງສູດ"}
            </button>
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

        {!r && !loading && !error && (
          <div className="no-print flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl">
            <Calculator size={36} className="opacity-30" />
            <p className="text-sm">ເລືອກເດືອນ ແລ້ວກົດ <span className="font-semibold text-emerald-700">ສະແດງຂໍ້ມູນ</span></p>
          </div>
        )}

        {r && (
          <div className="bg-white">
            <div className="text-center mb-3">
              <div className="text-lg font-bold">ຕາຕະລາງຄິດໄລ່ ອມພ , ອກຊ ແລະ ອາກອນລາຍໄດ້ຈາກຜູ້ຖືກລາງວັນ</div>
              <div className="font-bold">ຂອງ ບໍລິສັດ ຊີແອວ ແຂ່ງໝາຈຳກັດ</div>
              <div className="font-semibold">ປະຈຳເດືອນ {monthLabel(applied)}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className={TH + " w-16"}>ລຳດັບ</th>
                    <th rowSpan={2} className={TH}>ເນື້ອໃນ</th>
                    <th colSpan={3} className={TH}>ເດືອນ {monthLabel(applied)}</th>
                    {showFormula && <th rowSpan={2} className={TH + " no-print"}>ສູດ</th>}
                  </tr>
                  <tr>
                    <th className={TH}>ນ້ອງໝານຳໂຊກ</th>
                    <th className={TH}>ປູປາເຕົ້າມະຫາໂຊກ</th>
                    <th className={TH}>ລວມທັງໝົດ</th>
                  </tr>
                </thead>
                <tbody>
                  {LINES.map((ln) => {
                    const cell = (c: "DOG" | "PUP" | "TOTAL") => {
                      if (ln.totalOnly) {
                        if (c !== "TOTAL") return "";
                        return fmt0(ln.key === "I" ? r.I : r.J);
                      }
                      return fmt0(r[c][ln.key as keyof typeof r.DOG]);
                    };
                    const txtCls = ln.red ? "text-red-700" : ln.bold ? "text-[#1F3864]" : "";
                    const numCls = `${BD} text-right font-mono ${txtCls} ${ln.bold || ln.key === "A" ? "font-bold" : ""}`;
                    return (
                      <tr key={ln.key}>
                        <td className={BD + " text-center"}>{ln.no}</td>
                        <td className={`${BD} ${ln.bold ? "font-bold text-[#1F3864]" : ""}`}>
                          {ln.key === "J" ? `${ln.label} ${monthLabel(applied)}` : ln.label}
                        </td>
                        <td className={numCls}>{cell("DOG")}</td>
                        <td className={numCls}>{cell("PUP")}</td>
                        <td className={numCls + (ln.hi ? " bg-[#ffc000] hi-cell" : "")}>{cell("TOTAL")}</td>
                        {showFormula && <td className={BD + " text-xs text-slate-500 no-print"}>{ln.formula}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 text-center">
              <div className="font-bold">ນະຄອນຫຼວງວຽງຈັນ, ວັນທີ {todayLabel()}</div>
              <div className="font-bold mt-1">ຜູ້ອຳນວຍການ</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  Search,
  AlertCircle,
  Trophy,
  Printer,
  X,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import {
  exportScnWinSummary,
  fetchScnWinDrawDetail,
  fetchScnWinTax5Items,
  type ScnWinRow,
  type ScnWinDrawDetail,
  type ScnWinTaxItem,
} from "@/lib/ExportScnWinSummary";
import PageSkeleton from "@/components/PageSkeleton";

// ─── helpers ─────────────────────────────────────────────────────────────────
const isTotal = (row: ScnWinRow) => row["ງວດ"] === "ລວມ";

const fmt = (n: number | null | undefined) =>
  n == null
    ? ""
    : n === 0
      ? ""
      : Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "-";
  const d = String(s).slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(s).slice(0, 10);
};

type BonusKey = Exclude<keyof ScnWinDrawDetail, "DRAWID" | "DRAW_DATE">;

const BONUS_BREAKDOWN: { key: BonusKey; label: string }[] = [
  { key: "MATCHWIN2", label: "ເລກ 6 ໂຕຖືກ 2 ໂຕໜ້າຫຼັງ" },
  { key: "MATCHWIN3", label: "ເລກ 6 ໂຕຖືກ 3 ໂຕໜ້າຫຼັງ" },
  { key: "ADJACENT2", label: "ເລກຂ້າງຄຽງໜ້າ ເລກ 2 ໂຕ" },
  { key: "ADJACENT2FRONT", label: "ເລກຂ້າງຄຽງຫລັງ ເລກ 2 ໂຕ" },
  { key: "ADJACENT3", label: "ເລກຂ້າງຄຽງໜ້າ ເລກ 3 ໂຕ" },
  { key: "ADJACENT3FRONT", label: "ເລກຂ້າງຄຽງຫລັງ ເລກ 3 ໂຕ" },
  { key: "ADJACENT4", label: "ເລກຂ້າງຄຽງໜ້າ ເລກ 4 ໂຕ" },
  { key: "ADJACENT5", label: "ເລກຂ້າງຄຽງໜ້າ ເລກ 5 ໂຕ" },
  { key: "ADJACENT6", label: "ເລກຂ້າງຄຽງໜ້າ ເລກ 6 ໂຕ" },
  { key: "RANDOM3", label: "ເລກສະຫຼັບ 3 ໂຕ" },
  { key: "RANDOM4", label: "ເລກສະຫຼັບ 4 ໂຕ" },
  { key: "RANDOM5", label: "ເລກສະຫຼັບ 5 ໂຕ" },
  { key: "RANDOM6", label: "ເລກສະຫຼັບ 6 ໂຕ" },
  { key: "INVOICE2", label: "ເລກທ້າຍບິນ 2 ໂຕ" },
  { key: "INVOICE3", label: "ເລກທ້າຍບິນ 3 ໂຕ" },
  { key: "INVOICE4", label: "ເລກທ້າຍບິນ 4 ໂຕ" },
  { key: "INVOICE5", label: "ເລກທ້າຍບິນ 5 ໂຕ" },
  { key: "INVOICE6", label: "ເລກທ້າຍບິນ 6 ໂຕ" },
];

// ─── print CSS ───────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    @page { size: A4 portrait; margin: 10mm 8mm 20mm 8mm; }

    @page {
      @bottom-center {
        content: "ໜ້າ " counter(page) " / " counter(pages);
        font-size: 9px;
        font-family: 'Phetsarath OT', 'Phetsarath', sans-serif;
        color: #000;
      }
    }

    .print-area { gap: 4px !important; row-gap: 4px !important; }
    .print-area > div { margin-top: 0 !important; margin-bottom: 0 !important; }

    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100% !important; overflow: visible; padding: 0; box-sizing: border-box; }
    .no-print { display: none !important; }

    /* No faint shaded backgrounds anywhere when printing — plain white only */
    * {
      font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important;
      color: #000 !important;
      box-shadow: none !important;
      text-shadow: none !important;
      border-radius: 0 !important;
      background: #fff !important;
      background-color: #fff !important;
      background-image: none !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-area div {
      border-radius: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
      background-color: #fff !important;
    }

    /* Every table: equal 1px grid lines everywhere, no shading */
    table {
      font-size: 14px !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      box-shadow: none !important;
      background: #fff !important;
      page-break-inside: auto;
      margin: 0 !important;
    }

    th, td {
      padding: 3px 4px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow: visible !important;
      text-overflow: clip !important;
      border: 1px solid #000 !important;
      color: #000 !important;
      background: #fff !important;
      background-color: #fff !important;
      box-shadow: none !important;
    }

    thead tr th,
    thead th {
      background: #fff !important;
      background-color: #fff !important;
      color: #000 !important;
      font-weight: 700 !important;
      text-align: center !important;
      border: 1px solid #000 !important;
    }

    tr.total-row td {
      background: #fff !important;
      background-color: #fff !important;
      font-weight: 700 !important;
      border: 1px solid #000 !important;
    }

    tr.spend-row td {
      background: #ffff00 !important;
      background-color: #ffff00 !important;
      font-weight: 700 !important;
      border: 1px solid #000 !important;
    }

    /* ── Table 1 (main summary table): full page width, font 12, full grid ── */
    .main-table {
      width: 100% !important;
      table-layout: fixed !important;
      border: 1px solid #000 !important;
    }
    .main-table,
    .main-table th,
    .main-table td {
      font-size: 12px !important;
      border: 1px solid #000 !important;
    }

    /* ── Table 2 (SCN_PORTAL_DATA breakdown): matches the Excel export —
       no grid lines at all (plain rows), sized to content and sitting on
       the left of the page, font 12. Only the Total_Win row is highlighted. ── */
    .draw-block {
      page-break-inside: avoid;
      margin-top: 4px;
      display: block !important;
      float: none !important;
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      box-sizing: border-box !important;
    }
    .draw-block table {
      margin-bottom: 4px !important;
      width: 100% !important;
      min-width: 100% !important;
      table-layout: fixed !important;
      border: 1px solid #999 !important;
      border-collapse: collapse !important;
    }
    .draw-block table th,
    .draw-block table td {
      font-size: 12px !important;
      border: 1px solid #999 !important;
      white-space: nowrap !important;
      word-break: normal !important;
      overflow-wrap: normal !important;
    }
    .draw-block .total-win-row td {
      background: #92d050 !important;
      background-color: #92d050 !important;
      font-weight: 700 !important;
      border: 1px solid #999 !important;
    }

    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .overflow-x-auto { overflow: visible !important; width: 100% !important; }

    .print-signature {
      display: flex !important;
      justify-content: space-around;
      margin-top: 20mm;
      page-break-inside: avoid;
    }
    .print-signature .sig-box { text-align: center; width: 160px; }
    .print-signature .sig-line {
      border-top: 1px solid #000 !important;
      margin-top: 15mm;
      padding-top: 4px;
      font-size: 10px;
    }
    .print-signature .sig-role { font-size: 9px; margin-top: 2px; }
  }
`;

const COLS: { key: keyof ScnWinRow; label: string }[] = [
  { key: "ວັນທີ", label: "ວັນທີ" },
  { key: "ງວດ", label: "ງວດ" },
  { key: "ລາງວັນຕົວຕົງ", label: "ລາງວັນຕົວຕົງ" },
  { key: "ລາງວັນໂບນັດ", label: "ລາງວັນໂບນັດ" },
  { key: "ຄ່າທຳນຽມຕົວຕົງ", label: "ຄ່າທຳນຽມຕົວຕົງ" },
  { key: "ຄ່າທຳນຽມໂບນັດ", label: "ຄ່າທຳນຽມໂບນັດ" },
  { key: "ຄ່າທຳນຽມ ທ/ຄ", label: "ຄ່າທຳນຽມ ທ/ຄ" },
  { key: "ອາກອນ5%", label: "ອາກອນ5%" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function ScnWinSummaryPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [rows, setRows] = useState<ScnWinRow[]>([]);
  const [drawDetails, setDrawDetails] = useState<ScnWinDrawDetail[]>([]);
  const [taxItems, setTaxItems] = useState<ScnWinTaxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");

  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  // ── fetch from API ─────────────────────────────────────────────────────────
  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ view: "scn_win_summary" });
      if (from) qs.set("date_from", from);
      if (to) qs.set("date_to", to);
      const res = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);

      const details = await fetchScnWinDrawDetail(from, to);
      setDrawDetails(details);

      const tax5Items = await fetchScnWinTax5Items(from, to);
      setTaxItems(tax5Items);
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
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
    setHasSearched(false);
    setRows([]);
    setDrawDetails([]);
    setTaxItems([]);
    setError(null);
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportScnWinSummary(
        rows,
        drawDetails,
        taxItems,
        appliedFrom,
        appliedTo,
      );
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const dataRows = useMemo(() => rows.filter((r) => !isTotal(r)), [rows]);
  const totalRow = useMemo(() => rows.find((r) => isTotal(r)), [rows]);

  // ອາກອນ5% ລາຍການຍ່ອຍ (TAX SCN LOTTERY PRIZE) ສະແດງເປັນລາຍການລົງມາຕາມລໍາດັບ
  // ໂດຍໃຊ້ແຖວທີ່ມີຢູ່ແລ້ວ (ແຖວງວດ) ກ່ອນ, ຖ້າລາຍການອາກອນຫຼາຍກວ່າຈຳນວນແຖວ
  // ຈຶ່ງເພີ່ມແຖວຫວ່າງຕໍ່ທ້າຍ — ບໍ່ໄດ້ພະຍາຍາມຈັບຄູ່ກັບງວດ (DRAWID) ຂອງມັນເລີຍ
  const mainRowCount = Math.max(dataRows.length, taxItems.length);

  const hasData = hasSearched && dataRows.length > 0;
  const hasFilter = dateFrom || dateTo;

  // ລວມລາຍຈ່າຍ = ລາງວັນຕົວຕົງ + ລາງວັນໂບນັດ + ຄ່າທຳນຽມຕົວຕົງ + ຄ່າທຳນຽມໂບນັດ + ຄ່າທຳນຽມ ທ/ຄ
  const grandSpend = useMemo(() => {
    if (!totalRow) return 0;
    return (
      totalRow.ລາງວັນຕົວຕົງ +
      totalRow.ລາງວັນໂບນັດ +
      totalRow.ຄ່າທຳນຽມຕົວຕົງ +
      totalRow.ຄ່າທຳນຽມໂບນັດ +
      totalRow["ຄ່າທຳນຽມ ທ/ຄ"]
    );
  }, [totalRow]);

  const TH =
    "px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-gray-200 border border-black text-[11px]";
  const TD =
    "px-2 py-1.5 text-right font-mono border border-black text-[11px] whitespace-nowrap";
  const TDC =
    "px-2 py-1.5 text-center font-mono border border-black text-[11px]";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">
        {/* ── Screen Header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Trophy size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ຍອດຖືກລາງວັນ SCN — O_SCN_BCEL_STMT
              </h1>
              <p className="text-xs text-slate-400">
                ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍ SCN ຈຳແນກຕາມງວດ
              </p>
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
                      <RefreshCw size={13} className="animate-spin" /> ກຳລັງ
                      Export...
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

        {/* ── Filter ────────────────────────────────────────────────────── */}
        <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">
              ວັນທີ ຈາກ (BCEL_DATE)
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">
              ວັນທີ ຫາ (BCEL_DATE)
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
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
                {loading
                  ? "ກໍາລັງດຶງ..."
                  : `${dataRows.length.toLocaleString()} ງວດ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print Header: logo + print time (top-left) ───────────────── */}

        {/* ── Print title: centered ─────────────────────────────────────── */}
        <div
          className="hidden print:block mb-2"
          style={{ textAlign: "center" }}
        >
          <div style={{ fontSize: "13px", fontWeight: "bold" }}>
            ຕາຕະລາງສະຫລຸບຈ່າຍລາງວັນຫວຍຂອງ (BCEL-190)
          </div>
          <div style={{ fontSize: "11px" }}>
            ຈ່າຍລາງວັນຫວຍ SCN Easy ຍອດຂາຍຜ່ານ App
          </div>
          {(appliedFrom || appliedTo) && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ວັນທີ: {appliedFrom ? fmtDate(appliedFrom) : ""} ຫາ{" "}
              {appliedTo ? fmtDate(appliedTo) : ""}
            </div>
          )}
        </div>

        {/* ── Table 1: Summary by draw ─────────────────────────────────── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <PageSkeleton variant="flat" cols={8} rows={12} />
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <Trophy size={36} className="opacity-30" />
              <p className="text-sm">
                ເລືອກວັນທີ ແລ້ວກົດ{" "}
                <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : dataRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Trophy size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="main-table w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>ລ/ດ</th>
                    {COLS.map((c) => (
                      <th key={c.key} className={TH}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: mainRowCount }).map((_, i) => {
                    const row = dataRows[i];
                    const taxItem = taxItems[i];
                    return (
                      <tr key={i} className="hover:bg-blue-50">
                        <td className={TDC}>{row ? i + 1 : ""}</td>
                        <td className={TDC}>{row ? fmtDate(row.ວັນທີ) : ""}</td>
                        <td className={TDC + " text-blue-700 font-semibold"}>
                          {row ? row["ງວດ"] : ""}
                        </td>
                        <td className={TD}>
                          {row ? fmt(row.ລາງວັນຕົວຕົງ) : ""}
                        </td>
                        <td className={TD}>
                          {row ? fmt(row.ລາງວັນໂບນັດ) : ""}
                        </td>
                        <td className={TD}>
                          {row ? fmt(row.ຄ່າທຳນຽມຕົວຕົງ) : ""}
                        </td>
                        <td className={TD}>
                          {row ? fmt(row.ຄ່າທຳນຽມໂບນັດ) : ""}
                        </td>
                        <td className={TD}>
                          {row ? fmt(row["ຄ່າທຳນຽມ ທ/ຄ"]) : ""}
                        </td>
                        <td className={TD}>
                          {taxItem
                            ? fmt(taxItem.BCEL_CR)
                            : row
                              ? fmt(row["ອາກອນ5%"])
                              : ""}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ລວມ row */}
                  {totalRow && (
                    <tr className="total-row bg-gray-200 font-bold">
                      <td
                        className={TDC + " bg-gray-200 font-bold"}
                        colSpan={3}
                      >
                        ລວມ
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmt(totalRow.ລາງວັນຕົວຕົງ)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmt(totalRow.ລາງວັນໂບນັດ)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmt(totalRow.ຄ່າທຳນຽມຕົວຕົງ)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmt(totalRow.ຄ່າທຳນຽມໂບນັດ)}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmt(totalRow["ຄ່າທຳນຽມ ທ/ຄ"])}
                      </td>
                      <td className={TD + " bg-gray-200 font-bold"}>
                        {fmt(totalRow["ອາກອນ5%"])}
                      </td>
                    </tr>
                  )}

                  {/* ລວມລາຍຈ່າຍ (yellow highlight) */}
                  {totalRow && grandSpend > 0 && (
                    <tr className="spend-row bg-yellow-300 font-bold">
                      <td
                        className="px-3 py-2 text-left font-bold border border-black text-[11px] bg-yellow-300"
                        colSpan={3}
                      >
                        ລວມລາຍຈ່າຍ
                      </td>
                      <td
                        className="px-3 py-2 text-right font-mono font-bold border border-black text-[11px] bg-yellow-300"
                        colSpan={6}
                      >
                        {fmt(grandSpend)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Table 2: Draw detail breakdown ──────────────────────────── */}
        {hasData && drawDetails.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-700 no-print flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-600" />
              ລາຍລະອຽດແຍກຕາມງວດ (SCN_PORTAL_DATA)
            </h2>
            {drawDetails.map((d) => {
              const totalWin = d.REWARD_AFTER_TAX + d.TOTAL_BONUS;
              return (
                <div
                  key={d.DRAWID}
                  className="draw-block bg-white border border-black rounded-xl overflow-hidden"
                >
                  <div className="bg-blue-50 px-3 py-2 border-b border-black flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-sm">
                      ງວດ {d.DRAWID}
                    </span>
                    <span className="text-xs text-slate-500">
                      {fmtDate(d.DRAW_DATE)}
                    </span>
                  </div>
                  <table className="w-full text-xs border-collapse">
                    <colgroup>
                      <col style={{ width: "34%" }} />
                      <col style={{ width: "26%" }} />
                      <col style={{ width: "40%" }} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <td className="px-3 py-1.5 border border-black w-1/3">
                          ລວມລາງວັນ
                        </td>
                        <td className="px-3 py-1.5 border border-black text-[12px] text-slate-400 w-1/4">
                          Total_Reward
                        </td>
                        <td className="px-3 py-1.5 border border-black text-right font-mono">
                          {fmt(d.TOTAL_REWARD)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 border border-black">
                          ອາກອນລາງວັນ
                        </td>
                        <td className="px-3 py-1.5 border border-black text-[12px] text-slate-400">
                          Tax_Reward
                        </td>
                        <td className="px-3 py-1.5 border border-black text-right font-mono">
                          {fmt(d.TAX_REWARD)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 border border-black">
                          ຫລັງຫັກອາກອນ
                        </td>
                        <td className="px-3 py-1.5 border border-black text-[12px] text-slate-400">
                          Reward_After_Tax
                        </td>
                        <td className="px-3 py-1.5 border border-black text-right font-mono">
                          {fmt(d.REWARD_AFTER_TAX)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 border border-black">
                          ລາງວັນໂບນັດ
                        </td>
                        <td className="px-3 py-1.5 border border-black text-[12px] text-slate-400">
                          Total_Bonus
                        </td>
                        <td className="px-3 py-1.5 border border-black text-right font-mono">
                          {fmt(d.TOTAL_BONUS)}
                        </td>
                      </tr>
                      <tr className="total-win-row bg-blue-50 font-semibold">
                        <td className="px-3 py-1.5 border border-black">
                          ລວມຖືກລາງວັນ
                        </td>
                        <td className="px-3 py-1.5 border border-black text-[12px] text-slate-400">
                          Total_Win
                        </td>
                        <td className="px-3 py-1.5 border border-black text-right font-mono">
                          {fmt(totalWin)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-0.5 text-[10px] text-slate-400 border-0"
                        >
                          (= Reward_After_Tax + Total_Bonus)
                        </td>
                      </tr>
                      {BONUS_BREAKDOWN.map((b) => (
                        <tr key={String(b.key)}>
                          <td className="px-3 py-1.5 border border-black">
                            {b.label}
                          </td>
                          <td className="px-3 py-1.5 border border-black text-[12px] text-slate-400">
                            {String(b.key).toLowerCase()}
                          </td>
                          <td className="px-3 py-1.5 border border-black text-right font-mono">
                            {fmt(Number(d[b.key]))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Signature (print only) ─────────────────────────────────────── */}
        {hasData && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສະຫຼຸບ</div>
              <div className="sig-role">
                ( .............................................. )
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ກວດສອບ</div>
              <div className="sig-role">
                ( .............................................. )
              </div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ອະນຸມັດ</div>
              <div className="sig-role">
                ( .............................................. )
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

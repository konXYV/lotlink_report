"use client";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Search, ChevronUp, ChevronDown,
  AlertCircle, Receipt,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

interface SellRow {
  LOTTO_BILL_NO: string;
  DRAWID: string;
  DRAW_DATE: string;
  PAY_BY: string;
  OWNER: string;
  BILL_AMT: number | null;
  PAYMENT_AMT: number | null;
  DIFF_PAYMENT: number | null;
  SCN_PRO_AMT: number | null;
  SCN_COUPON_AMT: number | null;
  DISCOUNT_15_PERCENT: number | null;
  DIFF_PRO: number | null;
  COM_5_PERCENT: number | null;
  FINAL_SCN_COM: number | null;
}

type SortKey = keyof SellRow;
type SortDir = "asc" | "desc";

interface Totals {
  BILL_AMT: number; PAYMENT_AMT: number; DIFF_PAYMENT: number;
  SCN_PRO_AMT: number; SCN_COUPON_AMT: number; DISCOUNT_15_PERCENT: number;
  DIFF_PRO: number; COM_5_PERCENT: number; FINAL_SCN_COM: number;
}

const ZERO_TOTALS: Totals = {
  BILL_AMT: 0, PAYMENT_AMT: 0, DIFF_PAYMENT: 0,
  SCN_PRO_AMT: 0, SCN_COUPON_AMT: 0, DISCOUNT_15_PERCENT: 0,
  DIFF_PRO: 0, COM_5_PERCENT: 0, FINAL_SCN_COM: 0,
};

const PAGE_SIZE = 100;

const fmt  = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc"
    ? <ChevronUp   size={12} className="text-blue-500" />
    : <ChevronDown size={12} className="text-blue-500" />;
}

export default function ScnLottoSellPage() {
  const { user } = useAuth();
  // ── Server data ─────────────────────────────────────────────────────────
  const [pageRows,    setPageRows]    = useState<SellRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totals,      setTotals]      = useState<Totals>(ZERO_TOTALS);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Dropdown options (loaded once on mount) ──────────────────────────────
  const [allDrawIds, setAllDrawIds]   = useState<string[]>([]);
  const [allDates,   setAllDates]     = useState<string[]>([]);
  const [allPayBy,   setAllPayBy]     = useState<string[]>([]);
  const [optsLoading, setOptsLoading] = useState(true);

  // ── Filter inputs (uncommitted) ──────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [drawId,   setDrawId]   = useState("");
  const [drawDate, setDrawDate] = useState("");
  const [payBy,    setPayBy]    = useState("");

  // ── Committed filter + pagination + sort ─────────────────────────────────
  const [applied, setApplied] = useState({ search: "", drawId: "", drawDate: "", payBy: "" });
  const [page,    setPage]    = useState(1);
  const [sort,    setSort]    = useState<{ key: SortKey; dir: SortDir }>({ key: "DRAW_DATE", dir: "desc" });

  // ── Load dropdown options once ───────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setOptsLoading(true);
      try {
        const res  = await fetch("/api/oracle?view=sell_options");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "ໂຫຼດ options ລົ້ມເຫຼວ");
        setAllDrawIds(json.drawids ?? []);
        setAllDates  (json.dates   ?? []);
        setAllPayBy  (json.payBys  ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setOptsLoading(false);
      }
    })();
  }, []);

  // ── Core fetch — called with explicit args so memoisation is clean ───────
  const fetchPage = useCallback(async (
    filters: typeof applied,
    pg: number,
    sortState: typeof sort,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ view: "sell", page: String(pg), pageSize: String(PAGE_SIZE) });
      if (filters.drawId)   sp.set("drawid",    filters.drawId);
      if (filters.drawDate) sp.set("draw_date", filters.drawDate);
      if (filters.payBy)    sp.set("pay_by",    filters.payBy);
      if (filters.search)   sp.set("q",         filters.search);
      sp.set("sortKey", sortState.key as string);
      sp.set("sortDir", sortState.dir);

      const res  = await fetch(`/api/oracle?${sp.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");

      setPageRows(json.rows   ?? []);
      setTotal   (json.total  ?? 0);
      setTotals  (json.totals ?? ZERO_TOTALS);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch when page or sort changes (only after first search) ────────────
  useEffect(() => {
    if (!hasSearched) return;
    fetchPage(applied, page, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleApplyFilter = () => {
    const f = { search, drawId, drawDate, payBy };
    setApplied(f);
    setPage(1);
    setHasSearched(true);
    fetchPage(f, 1, sort);
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_search", detail: `ຄົ້ນຫາ: ${search || drawId || drawDate || payBy || "ທັງໝົດ"}` });
  };

  const clearFilters = () => {
    setSearch(""); setDrawId(""); setDrawDate(""); setPayBy("");
    setApplied({ search: "", drawId: "", drawDate: "", payBy: "" });
    setHasSearched(false);
    setPage(1);
    setPageRows([]);
    setTotal(0);
    setTotals(ZERO_TOTALS);
  };

  const toggleSort = (key: SortKey) => {
    const next: typeof sort = {
      key,
      dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc",
    };
    setSort(next);
    setPage(1);
    if (hasSearched) fetchPage(applied, 1, next);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter  = search || drawId || drawDate || payBy;

  const TH        = "px-3 py-2.5 text-center font-bold text-slate-700 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap bg-yellow-100 border border-yellow-300";
  const selectCls = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-48 disabled:opacity-50";
  const pageFrom  = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo    = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Receipt size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">ລາຍງານຍອດຂາຍຫວຍ SCN - ລາຍລະອຽດໃບບິນ</h1>
          </div>
        </div>
        <button
          onClick={() => hasSearched && fetchPage(applied, page, sort)}
          disabled={loading || !hasSearched}
          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        {/* Text search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
            placeholder="ຄົ້ນຫາ..."
            className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44"
          />
        </div>

        {/* DRAWID */}
        <select
          value={drawId}
          onChange={e => setDrawId(e.target.value)}
          disabled={optsLoading}
          className={selectCls}
        >
          <option value="">— ທຸກງວດ —</option>
          {allDrawIds.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* DRAW_DATE */}
        <select
          value={drawDate}
          onChange={e => setDrawDate(e.target.value)}
          disabled={optsLoading}
          className={selectCls}
        >
          <option value="">— ທຸກວັນທີ —</option>
          {allDates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* PAY_BY */}
        <select
          value={payBy}
          onChange={e => setPayBy(e.target.value)}
          disabled={optsLoading}
          className={selectCls}
        >
          <option value="">— ທຸກຊ່ອງທາງ —</option>
          {allPayBy.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Actions */}
        <button
          onClick={handleApplyFilter}
          disabled={loading || optsLoading}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 font-medium"
        >
          <Search size={13} /> ສະແດງຂໍ້ມູນ
        </button>

        {(hasFilter || hasSearched) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
          >
            <X size={12} /> ລ້າງ
          </button>
        )}

        <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-2">
          {optsLoading
            ? "ໂຫຼດ options..."
            : loading
            ? "ກໍາລັງໂຫຼດ..."
            : hasSearched
            ? `${total.toLocaleString()} ລາຍການ`
            : "ເລືອກຕົວກອງ"}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
            <p className="text-xs opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <RefreshCw size={20} className="animate-spin" />
            <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Search size={36} className="opacity-30" />
            <p className="text-sm">
              ເລືອກຕົວກອງແລ້ວກົດ{" "}
              <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span>{" "}
              ເພື່ອດຶງຂໍ້ມູນ
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-yellow-100 border-b-2 border-yellow-300">
                    {([
                      ["LOTTO_BILL_NO",      "ເລກໃບບິນ"],
                      ["DRAWID",             "ງວດ"],
                      ["DRAW_DATE",          "ວັນທີ"],
                      ["PAY_BY",             "ຊ່ອງທາງ"],
                      ["OWNER",              "ເຈົ້າຂອງ"],
                      ["BILL_AMT",           "ຍອດໃບບິນ"],
                      ["PAYMENT_AMT",        "ຍອດຊຳລະ"],
                      ["DIFF_PAYMENT",       "ສ່ວນຕ່າງຍອດຊໍາລະ"],
                      ["SCN_PRO_AMT",        "ສ່ວນຫຼຸດ SCN"],
                      ["SCN_COUPON_AMT",     "ຄູປອງ SCN"],
                      ["DISCOUNT_15_PERCENT","ສ່ວນຫຼຸດ 15%"],
                      ["DIFF_PRO",           "ສ່ວນຕ່າງສ່ວນຫຼຸດ"],
                      ["COM_5_PERCENT",      "5% SCN"],
                      ["FINAL_SCN_COM",      "ຈໍານວນເງິນທີ່ SCNຈະໄດ້ຮັບ"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th key={key as string} onClick={() => toggleSort(key)} className={TH}>
                        <span className="flex items-center justify-center gap-1">
                          {label}
                          <SortIcon col={key} sort={sort} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="text-center py-16 text-slate-400">
                        <Search size={32} className="mx-auto mb-2 opacity-30" />
                        <p>ບໍ່ມີຂໍ້ມູນ</p>
                      </td>
                    </tr>
                  ) : (
                    <>
                      {pageRows.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 text-center font-mono text-blue-700 font-medium border border-slate-200">{r.LOTTO_BILL_NO}</td>
                          <td className="px-3 py-2 text-center border border-slate-200">{r.DRAWID}</td>
                          <td className="px-3 py-2 text-center border border-slate-200">{r.DRAW_DATE}</td>
                          <td className="px-3 py-2 text-center border border-slate-200">
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium text-xs">{r.PAY_BY}</span>
                          </td>
                          <td className="px-3 py-2 text-center border border-slate-200">{r.OWNER}</td>
                          <td className="px-3 py-2 text-right font-mono border border-slate-200">{fmt(r.BILL_AMT)}</td>
                          <td className="px-3 py-2 text-right font-mono border border-slate-200">{fmt(r.PAYMENT_AMT)}</td>
                          <td className={`px-3 py-2 text-right font-mono border border-slate-200 ${Number(r.DIFF_PAYMENT) < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(r.DIFF_PAYMENT)}</td>
                          <td className="px-3 py-2 text-right font-mono border border-slate-200">{fmt(r.SCN_PRO_AMT)}</td>
                          <td className="px-3 py-2 text-right font-mono border border-slate-200">{fmt(r.SCN_COUPON_AMT)}</td>
                          <td className="px-3 py-2 text-right font-mono border border-slate-200">{fmt(r.DISCOUNT_15_PERCENT)}</td>
                          <td className={`px-3 py-2 text-right font-mono border border-slate-200 ${Number(r.DIFF_PRO) < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(r.DIFF_PRO)}</td>
                          <td className="px-3 py-2 text-right font-mono border border-slate-200">{fmt(r.COM_5_PERCENT)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-blue-700 border border-slate-200">{fmt(r.FINAL_SCN_COM)}</td>
                        </tr>
                      ))}

                      {/* Grand total row — aggregate ຈາກ server (ທຸກ row ທີ່ filter ໄດ້) */}
                      <tr className="bg-yellow-100 border-t-2 border-yellow-400 font-bold">
                        <td className="px-3 py-2.5 text-center border border-yellow-300" colSpan={5}>
                          ລວມທັງໝົດ ({total.toLocaleString()} ລາຍການ)
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono border border-yellow-300">{fmt(totals.BILL_AMT)}</td>
                        <td className="px-3 py-2.5 text-right font-mono border border-yellow-300">{fmt(totals.PAYMENT_AMT)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono border border-yellow-300 ${totals.DIFF_PAYMENT < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(totals.DIFF_PAYMENT)}</td>
                        <td className="px-3 py-2.5 text-right font-mono border border-yellow-300">{fmt(totals.SCN_PRO_AMT)}</td>
                        <td className="px-3 py-2.5 text-right font-mono border border-yellow-300">{fmt(totals.SCN_COUPON_AMT)}</td>
                        <td className="px-3 py-2.5 text-right font-mono border border-yellow-300">{fmt(totals.DISCOUNT_15_PERCENT)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono border border-yellow-300 ${totals.DIFF_PRO < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(totals.DIFF_PRO)}</td>
                        <td className="px-3 py-2.5 text-right font-mono border border-yellow-300">{fmt(totals.COM_5_PERCENT)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-blue-700 border border-yellow-300">{fmt(totals.FINAL_SCN_COM)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-500">
                  ສະແດງ {pageFrom.toLocaleString()}–{pageTo.toLocaleString()} ຈາກ {total.toLocaleString()} ລາຍການ
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(1)} disabled={page === 1 || loading}
                    className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition">«</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                    className="p-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if      (totalPages <= 5)         p = i + 1;
                    else if (page <= 3)               p = i + 1;
                    else if (page >= totalPages - 2)  p = totalPages - 4 + i;
                    else                              p = page - 2 + i;
                    return (
                      <button key={p} onClick={() => setPage(p)} disabled={loading}
                        className={`px-2.5 py-1 text-xs rounded border transition ${
                          p === page
                            ? "bg-blue-600 text-white border-blue-600 font-bold"
                            : "border-slate-200 hover:bg-slate-100"
                        }`}>{p}</button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                    className="p-1 rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition">
                    <ChevronRight size={14} />
                  </button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages || loading}
                    className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-100 transition">»</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
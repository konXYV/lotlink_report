"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw, Search, AlertCircle, BarChart3, X, Filter, AlertTriangle, FileDown,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import PageSkeleton from "@/components/PageSkeleton";
import { logActivity } from "@/lib/activityService";
import { exportOverdueUnpaidReward, type OverdueUnpaidRewardRow } from "@/lib/ExportOverdueUnpaidReward";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "-";
  const datePart = String(s).slice(0, 10).split("-");
  const timePart = String(s).slice(11);
  const d = datePart.length === 3 ? `${datePart[2]}/${datePart[1]}/${datePart[0]}` : String(s);
  return timePart ? `${d} ${timePart}` : d;
};

export default function OverdueUnpaidRewardPage() {
  const { user, perm } = useAuth();

  const [rows,        setRows]        = useState<OverdueUnpaidRewardRow[]>([]);
  const [loadingRows, setLoadingRows]  = useState(false);
  const [rowsError,   setRowsError]   = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo,   setDrawTo]   = useState("");
  const [days,     setDays]     = useState("15");
  const [search,   setSearch]   = useState("");

  const [appliedDrawFrom, setAppliedDrawFrom] = useState("");
  const [appliedDrawTo,   setAppliedDrawTo]   = useState("");
  const [appliedDays,     setAppliedDays]     = useState("15");
  const [appliedSearch,   setAppliedSearch]   = useState("");

  const fetchRows = async (from: string, to: string, d: string) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "overdue_unpaid_reward" });
      if (from) qs.set("from", from);
      if (to)   qs.set("to", to);
      if (d)    qs.set("days", d);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: unknown) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedDrawFrom(drawFrom);
    setAppliedDrawTo(drawTo);
    setAppliedDays(days);
    setAppliedSearch(search);
    setHasSearched(true);
    fetchRows(drawFrom, drawTo, days);
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "overdue_unpaid_reward_search",
      detail: `ງວດ: ${drawFrom || ""}~${drawTo || ""}  ເກີນ ${days} ວັນ  ${search || ""}`.trim(),
    });
  };

  const clearFilters = () => {
    setDrawFrom(""); setDrawTo(""); setDays("15"); setSearch("");
    setAppliedDrawFrom(""); setAppliedDrawTo(""); setAppliedDays("15"); setAppliedSearch("");
    setHasSearched(false);
    setRows([]);
  };

  const filtered = useMemo(() => {
    if (!hasSearched) return [];
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.LOTTO_BILL_NO.toLowerCase().includes(q) || r.DRAWID.toLowerCase().includes(q),
    );
  }, [rows, appliedSearch, hasSearched]);

  const totals = useMemo(() => ({
    COUNT:        filtered.length,
    TOTAL_REWARD: filtered.reduce((s, r) => s + Number(r.TOTAL_REWARD ?? 0), 0),
  }), [filtered]);

  const hasFilter = drawFrom || drawTo || days !== "15" || search;

  const handleExport = async () => {
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "overdue_unpaid_reward_export",
      detail: `Export: ${appliedDrawFrom || ""}~${appliedDrawTo || ""} (${filtered.length} ລາຍການ)`,
    });
    await exportOverdueUnpaidReward(
      filtered, Number(appliedDays || "15"), appliedDrawFrom, appliedDrawTo, user?.displayName ?? "",
    );
  };

  const TH = "px-3 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50 border border-black text-[11px]";

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">ລາຍງານ ລາງວັນຄ້າງຈ່າຍ (ເກີນ 15 ວັນ)</h1>
            <p className="text-xs text-slate-400">LOTLINK_REWARD ທີ່ບໍ່ພົບລາຍການຈ່າຍໃນ LOTLINK_PAYOUT</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchRows(appliedDrawFrom, appliedDrawTo, appliedDays)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black text-slate-600 hover:bg-slate-50 transition">
            <RefreshCw size={13} className={loadingRows ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
          </button>
          {perm("issue_print") && (
            <button onClick={handleExport} disabled={filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
              <FileDown size={13} /> Export Excel
            </button>
          )}
        </div>
      </div>

      {/* ── Filter ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
          <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">ງວດທີ ຈາກ</label>
          <input value={drawFrom} onChange={e => setDrawFrom(e.target.value)}
            placeholder="ຕົວຢ່າງ: 26050"
            className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">ງວດທີ ຫາ</label>
          <input value={drawTo} onChange={e => setDrawTo(e.target.value)}
            placeholder="ຕົວຢ່າງ: 26070"
            className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-32" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">ຄ້າງຈ່າຍເກີນ (ວັນ)</label>
          <input type="number" min={1} value={days} onChange={e => setDays(e.target.value)}
            className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-24" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ ເລກບິນ / ງວດ</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
              placeholder="ຄົ້ນຫາ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={handleApplyFilter} disabled={loadingRows}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">
            {loadingRows
              ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
              : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
          </button>
          {(hasFilter || hasSearched) && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
              <X size={12} /> ລ້າງ
            </button>
          )}
          <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
            {loadingRows ? "ກໍາລັງດຶງ..." : hasSearched ? `${filtered.length.toLocaleString()} ລາຍການ` : "-"}
          </span>
        </div>
      </div>

      {rowsError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
            <p className="text-xs opacity-80 mt-0.5">{rowsError}</p>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-black rounded-xl overflow-hidden">
        {loadingRows ? (
          <PageSkeleton variant="flat" cols={5} rows={12} />
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <BarChart3 size={36} className="opacity-30" />
            <p className="text-sm">ໃສ່ຕົວກອງ (ຫຼືປ່ອຍວ່າງເພື່ອທັງໝົດ) ແລ້ວກົດ <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className={TH}>ວັນທີອອກງວດ</th>
                  <th className={TH}>ງວດ</th>
                  <th className={TH}>ເລກບິນ</th>
                  <th className={TH}>ຍອດຖືກລາງວັນ</th>
                  <th className={TH}>ຊ່ອງທາງ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-slate-400">
                    <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                    <p>ບໍ່ມີລາຍການຄ້າງຈ່າຍໃນຊ່ວງທີ່ເລືອກ</p>
                  </td></tr>
                ) : (
                  <>
                    {filtered.map((r, i) => (
                      <tr key={`${r.DRAWID}-${r.LOTTO_BILL_NO}-${i}`} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-center border border-black">{fmtDate(r.DRAWDATE)}</td>
                        <td className="px-3 py-1.5 text-center border border-black font-medium">{r.DRAWID}</td>
                        <td className="px-3 py-1.5 text-left border border-black font-mono">{r.LOTTO_BILL_NO}</td>
                        <td className="px-3 py-1.5 text-right border border-black">{fmt(r.TOTAL_REWARD)}</td>
                        <td className="px-3 py-1.5 text-center border border-black">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${r.SELL_USER === "APP" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                            {r.SELL_USER}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-center border border-black">
                        ລວມທັງໝົດ ({totals.COUNT.toLocaleString()} ລາຍການ)
                      </td>
                      <td className="px-3 py-2 text-right border border-black">{fmt(totals.TOTAL_REWARD)}</td>
                      <td className="border border-black" />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

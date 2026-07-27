"use client";
// ════════════════════════════════════════════════════════════════════════════
//  PayoutByUserSection
//  ─────────────────────────────────────────────────────────────────────────
//  Shared "bottom table" used by the 3 new unit/province ledger report pages.
//  Live-fetches ECOMMERCE2026.LOTLINK_PAYOUT grouped BY USER for the same
//  ງວດ (draw id) range as the report's top table, via the existing
//  `view=payout_users` API action.
//
//  IMPORTANT: usernames are kept case-sensitive — "SBS02" and "sbs02" are
//  two distinct users and must stay as two separate rows. Only exact
//  (trimmed) duplicate strings are combined.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle, Users } from "lucide-react";

export interface PayoutUserRow {
  user: string; // display name (first-seen casing)
  totalAmount: number;
  totalCount: number;
}

const fmt = (n: number) =>
  Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

interface Props {
  /** Payout date range, ISO "YYYY-MM-DD" (from an <input type="date">).
   *  This is the same "ງວດ" date shown in the top table. Leave blank to skip fetching. */
  dateFrom: string;
  dateTo: string;
  /** Called whenever the (deduped) rows change, so the parent page can use
   *  the total for its own "ລາງວັນ" / tax calculations and for xlsx export. */
  onRowsChange?: (rows: PayoutUserRow[]) => void;
  title?: string;
}

export default function PayoutByUserSection({
  dateFrom,
  dateTo,
  onRowsChange,
  title = "ຍອດຈ່າຍ (Payout) ຕາມ User — ງວດນີ້",
}: Props) {
  const [rows, setRows] = useState<PayoutUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateFrom && !dateTo) {
      setRows([]);
      onRowsChange?.([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ view: "payout_users" });
        if (dateFrom) qs.set("date_from", dateFrom);
        if (dateTo) qs.set("date_to", dateTo);
        const res = await fetch(`/api/oracle?${qs}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນ payout ລົ້ມເຫຼວ");

        // Combine only exact (trimmed) duplicate usernames — case is
        // significant, so "SBS02" and "sbs02" are NOT merged.
        const map = new Map<string, PayoutUserRow>();
        for (const r of (json.rows ?? []) as Record<string, unknown>[]) {
          const display = String(r.PAYOUT_USER ?? "").trim();
          if (!display) continue;
          const key = display; // exact match, case-sensitive
          const amt = Number(r.TOTAL_AMOUNT ?? 0);
          const cnt = Number(r.TOTAL_COUNT ?? 0);
          const existing = map.get(key);
          if (existing) {
            existing.totalAmount += amt;
            existing.totalCount += cnt;
          } else {
            map.set(key, { user: display, totalAmount: amt, totalCount: cnt });
          }
        }
        const merged = Array.from(map.values()).sort((a, b) =>
          a.user.localeCompare(b.user),
        );
        if (!cancelled) {
          setRows(merged);
          onRowsChange?.(merged);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const total = useMemo(
    () => rows.reduce((s, r) => s + r.totalAmount, 0),
    [rows],
  );

  if (!dateFrom && !dateTo) return null;

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users size={16} className="text-blue-500" />
          {title}
        </h3>
        {loading && (
          <RefreshCw size={14} className="animate-spin text-slate-400" />
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-xs text-slate-400">
          ບໍ່ພົບຂໍ້ມູນ payout ສຳລັບງວດນີ້
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="border border-slate-200 px-3 py-2 text-left">
                  User
                </th>
                <th className="border border-slate-200 px-3 py-2 text-right">
                  ຈຳນວນລາຍການ
                </th>
                <th className="border border-slate-200 px-3 py-2 text-right">
                  ຍອດຈ່າຍ
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user}>
                  <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-700">
                    {r.user}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-600">
                    {fmt(r.totalCount)}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-800">
                    {fmt(r.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-semibold text-slate-800">
                <td className="border border-slate-200 px-3 py-1.5">
                  ລວມທັງໝົດ
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right">
                  {fmt(rows.reduce((s, r) => s + r.totalCount, 0))}
                </td>
                <td className="border border-slate-200 px-3 py-1.5 text-right">
                  {fmt(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

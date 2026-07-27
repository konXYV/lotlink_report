"use client";
// ════════════════════════════════════════════════════════════════════════════
//  UnitLedgerEditor
//  ─────────────────────────────────────────────────────────────────────────
//  Shared "top table" for the 3 ledger-style report pages
//  (unit/province name + ງວດ + ຍອດຂາຍ + % + ຍອດໂອນ[+ເຫຼືອ] + ຍອດຕ້ອງຖອກ).
//
//  ໜ່ວຍ/ແຂວງ ແລະ ຍອດຂາຍ (name + sale) are auto-populated from the
//  unit_sell_summary Oracle query (see UnitLedgerPageBase) — NOT manually
//  entered. Only ຍອດໂອນ (transferred) and ເຫຼືອ (remaining) stay editable,
//  since actual cash transfers aren't tracked in the DB.
// ════════════════════════════════════════════════════════════════════════════

import { Plus, Trash2 } from "lucide-react";

export interface LedgerRow {
  id: string;
  name: string;
  sale: number;
  transferred: number;
  remaining: number; // only used when hasRemainingCol is true
}

const fmt = (n: number) =>
  n === 0 ? "-" : Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 });

export function computeDue(row: LedgerRow, rate: number, hasRemainingCol: boolean) {
  const pct = row.sale * rate;
  return hasRemainingCol
    ? row.sale - pct - row.remaining
    : row.sale - pct - row.transferred;
}

interface Props {
  entityLabel: string; // "ໜ່ວຍ" | "ແຂວງ"
  /** ISO "YYYY-MM-DD" — the ງວດ/payout date shared by every row in this table. */
  periodDate: string;
  onPeriodDateChange: (v: string) => void;
  rate: number;
  onRateChange: (v: number) => void;
  rows: LedgerRow[];
  onRowsChange: (rows: LedgerRow[]) => void;
  hasRemainingCol?: boolean;
  /** When true, name + sale come from the Oracle query and are read-only;
   *  add/remove row controls are hidden since rows are DB-driven. */
  autoRows?: boolean;
}

export default function UnitLedgerEditor({
  entityLabel,
  periodDate,
  onPeriodDateChange,
  rate,
  onRateChange,
  rows,
  onRowsChange,
  hasRemainingCol = false,
  autoRows = false,
}: Props) {
  const addRow = () =>
    onRowsChange([
      ...rows,
      { id: crypto.randomUUID(), name: "", sale: 0, transferred: 0, remaining: 0 },
    ]);

  const removeRow = (id: string) => onRowsChange(rows.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<LedgerRow>) =>
    onRowsChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const totals = rows.reduce(
    (acc, r) => {
      const pct = r.sale * rate;
      const due = computeDue(r, rate, hasRemainingCol);
      acc.sale += r.sale;
      acc.pct += pct;
      acc.transferred += r.transferred;
      acc.remaining += r.remaining;
      acc.due += due;
      return acc;
    },
    { sale: 0, pct: 0, transferred: 0, remaining: 0, due: 0 },
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            ງວດ / ວັນທີ (ໃຊ້ອ້າງອີງ payout ນຳ)
          </label>
          <input
            type="date"
            value={periodDate}
            onChange={(e) => onPeriodDateChange(e.target.value)}
            className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">% ອັດຕາ</label>
          <input
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value) || 0)}
            className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        {!autoRows && (
          <button
            onClick={addRow}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} /> ເພີ່ມແຖວ {entityLabel}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="border border-slate-200 px-3 py-2 text-left">{entityLabel}</th>
              <th className="border border-slate-200 px-3 py-2 text-right">ລວມຍອດຂາຍ</th>
              <th className="border border-slate-200 px-3 py-2 text-right">%</th>
              {hasRemainingCol && (
                <th className="border border-slate-200 px-3 py-2 text-right">ເຫຼືອ</th>
              )}
              <th className="border border-slate-200 px-3 py-2 text-right">ຍອດໂອນ</th>
              <th className="border border-slate-200 px-3 py-2 text-right">ຍອດຕ້ອງຖອກ</th>
              <th className="border border-slate-200 px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct = r.sale * rate;
              const due = computeDue(r, rate, hasRemainingCol);
              return (
                <tr key={r.id}>
                  <td className="border border-slate-200 px-2 py-1">
                    {autoRows ? (
                      <span className="block px-1 py-0.5 text-slate-700">{r.name}</span>
                    ) : (
                      <input
                        value={r.name}
                        onChange={(e) => updateRow(r.id, { name: e.target.value })}
                        className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-300 focus:border-blue-400"
                      />
                    )}
                  </td>
                  <td className="border border-slate-200 px-2 py-1">
                    {autoRows ? (
                      <span className="block px-1 py-0.5 text-right text-slate-700">{fmt(r.sale)}</span>
                    ) : (
                      <input
                        type="number"
                        value={r.sale || ""}
                        onChange={(e) => updateRow(r.id, { sale: Number(e.target.value) || 0 })}
                        className="w-full rounded border border-transparent px-1 py-0.5 text-right hover:border-slate-300 focus:border-blue-400"
                      />
                    )}
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-500">
                    {fmt(pct)}
                  </td>
                  {hasRemainingCol && (
                    <td className="border border-slate-200 px-2 py-1">
                      <input
                        type="number"
                        value={r.remaining || ""}
                        onChange={(e) => updateRow(r.id, { remaining: Number(e.target.value) || 0 })}
                        className="w-full rounded border border-transparent px-1 py-0.5 text-right hover:border-slate-300 focus:border-blue-400"
                      />
                    </td>
                  )}
                  <td className="border border-slate-200 px-2 py-1">
                    <input
                      type="number"
                      value={r.transferred || ""}
                      onChange={(e) => updateRow(r.id, { transferred: Number(e.target.value) || 0 })}
                      className="w-full rounded border border-transparent px-1 py-0.5 text-right hover:border-slate-300 focus:border-blue-400"
                    />
                  </td>
                  <td className="border border-slate-200 px-3 py-1.5 text-right font-medium text-slate-800">
                    {fmt(due)}
                  </td>
                  <td className="border border-slate-200 px-1 py-1 text-center">
                    {!autoRows && (
                      <button onClick={() => removeRow(r.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={hasRemainingCol ? 7 : 6} className="border border-slate-200 px-3 py-6 text-center text-slate-400">
                  {autoRows
                    ? "ບໍ່ພົບຂໍ້ມູນຍອດຂາຍສຳລັບງວດ/ວັນທີນີ້"
                    : 'ຍັງບໍ່ມີແຖວ — ກົດ "ເພີ່ມແຖວ" ເພື່ອເລີ່ມປ້ອນຂໍ້ມູນ'}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-semibold text-slate-800">
                <td className="border border-slate-200 px-3 py-1.5">ລວມທັງໝົດ</td>
                <td className="border border-slate-200 px-3 py-1.5 text-right">{fmt(totals.sale)}</td>
                <td className="border border-slate-200 px-3 py-1.5 text-right">{fmt(totals.pct)}</td>
                {hasRemainingCol && (
                  <td className="border border-slate-200 px-3 py-1.5 text-right">{fmt(totals.remaining)}</td>
                )}
                <td className="border border-slate-200 px-3 py-1.5 text-right">{fmt(totals.transferred)}</td>
                <td className="border border-slate-200 px-3 py-1.5 text-right">{fmt(totals.due)}</td>
                <td className="border border-slate-200 px-3 py-1.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

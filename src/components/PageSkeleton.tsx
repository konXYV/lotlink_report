"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Bone — base pulse unit
// ─────────────────────────────────────────────────────────────────────────────
function Bone({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PageHeaderSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
      <div className="flex items-center gap-2.5">
        <Bone className="w-9 h-9 rounded-xl shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Bone className="h-4 w-52" />
          <Bone className="h-3 w-72 opacity-60" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Bone className="h-8 w-24 rounded-lg" />
        <Bone className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterPanelSkeleton
// ─────────────────────────────────────────────────────────────────────────────
function FilterPanelSkeleton() {
  return (
    <div className="bg-white border border-black rounded-xl p-4 mb-4 no-print">
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <Bone className="h-3.5 w-14 opacity-50" />
        {[20, 16, 20, 16, 20, 16].map((w, i) => (
          <Bone key={i} className={`h-6 rounded-lg`} style={{ width: `${w * 4}px` }} />
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <Bone className="h-3 w-16 opacity-50" />
            <Bone className="h-9 w-36 rounded-lg" />
          </div>
        ))}
        <Bone className="h-9 w-28 rounded-lg" />
        <Bone className="h-9 w-16 rounded-lg opacity-60" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryCardsSkeleton — stat cards above the table
// ─────────────────────────────────────────────────────────────────────────────
export function SummaryCardsSkeleton({ count = 3 }: { count?: number }) {
  const colors = [
    "bg-blue-50 border-blue-200",
    "bg-emerald-50 border-emerald-200",
    "bg-slate-50 border-slate-200",
    "bg-amber-50 border-amber-200",
  ];
  const iconColors = ["bg-blue-100", "bg-emerald-100", "bg-slate-100", "bg-amber-100"];
  return (
    <div
      className="no-print grid gap-3 mb-4"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`border rounded-xl p-3 flex items-center gap-3 animate-pulse ${colors[i % colors.length]}`}
        >
          <div className={`w-8 h-8 rounded-lg shrink-0 ${iconColors[i % iconColors.length]}`} />
          <div className="flex flex-col gap-1.5 flex-1">
            <Bone className="h-2.5 w-24" />
            <Bone className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table skeletons
// ─────────────────────────────────────────────────────────────────────────────
function TableRowSkeleton({ cols = 10, rowIndex = 0 }: { cols?: number; rowIndex?: number }) {
  const widths = ["w-8", "w-16", "w-20", "w-24", "w-16", "w-20", "w-16", "w-20", "w-16", "w-14"];
  const opacity = rowIndex % 3 === 2 ? "opacity-50" : rowIndex % 3 === 1 ? "opacity-75" : "";
  return (
    <tr className={`border-b border-slate-100 ${opacity}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2.5 text-center">
          <Bone className={`h-3.5 mx-auto ${widths[i % widths.length]}`} />
        </td>
      ))}
    </tr>
  );
}

export function FlatTableSkeleton({ cols = 10, rows = 12 }: { cols?: number; rows?: number }) {
  return (
    <div className="bg-white border border-black rounded-xl overflow-hidden no-print">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-3 py-2.5">
                  <Bone className="h-3 w-14 mx-auto opacity-60" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={cols} rowIndex={i} />
            ))}
            <tr className="bg-slate-100 border-t-2 border-slate-300">
              {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-3 py-2.5">
                  <Bone className="h-3.5 w-16 mx-auto opacity-50" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupedHeaderSkeleton({ cols }: { cols: number }) {
  return (
    <>
      <tr className="bg-yellow-50 border-b border-slate-200">
        <td colSpan={2} className="px-3 py-2" />
        <td colSpan={Math.floor((cols - 2) / 2)} className="px-3 py-2">
          <Bone className="h-3 w-28 mx-auto opacity-50" />
        </td>
        <td colSpan={cols - 2 - Math.floor((cols - 2) / 2)} className="px-3 py-2">
          <Bone className="h-3 w-24 mx-auto opacity-50" />
        </td>
      </tr>
      <tr className="bg-yellow-50/60 border-b-2 border-slate-300">
        {Array.from({ length: cols }).map((_, i) => (
          <th key={i} className="px-3 py-2">
            <Bone className="h-3 w-10 mx-auto opacity-40" />
          </th>
        ))}
      </tr>
    </>
  );
}

function DateGroupSkeleton({ cols }: { cols: number }) {
  return (
    <div className="bg-white border border-black rounded-xl overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-black">
        <div className="flex items-center gap-3">
          <Bone className="h-4 w-24" />
          <Bone className="h-3.5 w-20 opacity-60" />
          <Bone className="h-3.5 w-20 opacity-60" />
        </div>
        <Bone className="h-5 w-5 rounded" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <GroupedHeaderSkeleton cols={cols} />
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <TableRowSkeleton key={i} cols={cols} rowIndex={i} />
            ))}
            <tr className="bg-slate-50 border-t border-slate-200">
              {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-3 py-2 text-center">
                  <Bone className={`h-3.5 mx-auto opacity-40 ${i < 2 ? "w-16" : "w-20"}`} />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PayoutPageSkeleton({ cols = 12 }: { cols?: number }) {
  return (
    <div className="w-full">
      <DateGroupSkeleton cols={cols} />
      <DateGroupSkeleton cols={cols} />
      <div className="bg-white border border-black rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <Bone className="h-4 w-32 opacity-60" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="bg-gray-100">
                {Array.from({ length: cols }).map((_, i) => (
                  <td key={i} className="px-3 py-3 text-center">
                    <Bone className="h-4 mx-auto w-20 opacity-50" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RoutePageSkeleton — full-page skeleton for loading.tsx
// Order: header → filter → [cards] → table
// ─────────────────────────────────────────────────────────────────────────────
export function RoutePageSkeleton({
  variant = "flat",
  cols = 10,
  rows = 12,
  cards = 0,        // number of summary stat cards above the table (0 = none)
}: {
  variant?: "flat" | "payout";
  cols?: number;
  rows?: number;
  cards?: number;
}) {
  return (
    <div className="w-full animate-in fade-in duration-150">
      <PageHeaderSkeleton />
      <FilterPanelSkeleton />
      {cards > 0 && <SummaryCardsSkeleton count={cards} />}
      {variant === "payout" ? (
        <PayoutPageSkeleton cols={cols} />
      ) : (
        <FlatTableSkeleton cols={cols} rows={rows} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export — backward compat (data loading inside pages)
// ─────────────────────────────────────────────────────────────────────────────
export default function PageSkeleton({
  variant = "flat",
  cols,
  rows,
}: {
  variant?: "flat" | "payout";
  cols?: number;
  rows?: number;
}) {
  return (
    <div className="w-full animate-in fade-in duration-150 no-print">
      {variant === "payout" ? (
        <PayoutPageSkeleton cols={cols ?? 12} />
      ) : (
        <FlatTableSkeleton cols={cols ?? 10} rows={rows ?? 12} />
      )}
    </div>
  );
}

type RowProps = {
  label: string;
  value?: React.ReactNode;
};

export function Row({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="min-w-0 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="break-all text-right text-xs font-medium text-slate-800">
        {value ?? "-"}
      </span>
    </div>
  );
}

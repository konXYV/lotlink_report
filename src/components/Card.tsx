type CardProps = {
  title: string;
  value: React.ReactNode;
};

export function Card({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 truncate text-lg font-bold text-slate-800">
        {value ?? "-"}
      </p>
    </div>
  );
}

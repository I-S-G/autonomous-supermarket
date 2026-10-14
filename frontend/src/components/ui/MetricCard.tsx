type MetricCardProps = {
  label: string;
  value: string | number;
  description?: string;
};

export default function MetricCard({
  label,
  value,
  description,
}: MetricCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className="mt-3 break-words text-2xl font-bold text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs text-slate-500">{description}</p>
      )}
    </article>
  );
}

// components/Badge.tsx
interface BadgeProps {
  value?: string | null;
}

export function Badge({ value }: BadgeProps) {
  const getClass = () => {
    switch (value) {
      case "DONE":
        return "bg-primary-700 text-white border-primary-700";
      // ... existing cases
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getClass()}`}
    >
      {value ?? "-"}
    </span>
  );
}

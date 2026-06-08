
export const formatMoney = (value?: number | string | null): string => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
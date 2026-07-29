export function parseDueDate(value?: string): Date | null {
  if (!value) return null;

  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T23:59:59`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}
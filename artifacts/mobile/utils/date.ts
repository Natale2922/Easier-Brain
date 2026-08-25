export function parseDueDate(value?: string): Date | null {
  if (!value) return null;

  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T23:59:59`);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

export function parseTaskDueDate(value?: string, time?: string): Date | null {
  const date = parseDueDate(value);
  if (!date) return null;
  if (time) {
    const [hour, minute] = time.split(':').map(Number);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      date.setHours(hour, minute, 0, 0);
    }
  }
  return date;
}
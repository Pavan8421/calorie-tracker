/** Format an ISO timestamp for `<input type="datetime-local" />` in local time. */
export function toDatetimeLocalValue(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value to ISO UTC string for the API. */
export function fromDatetimeLocalValue(local: string | undefined | null): string | null {
  if (!local || !local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocalValue(new Date());
}

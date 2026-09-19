/**
 * Date utilities to avoid timezone day-shift bugs.
 *
 * Problem: storing `date.toISOString()` for a Date created at LOCAL
 * midnight shifts the stored UTC instant to the PREVIOUS day for any
 * timezone ahead of UTC (e.g. Romania, UTC+2/+3). Reading it back with
 * `.split('T')[0]` then shows the wrong (earlier) day.
 *
 * Fix: normalize all date-only values to LOCAL NOON before converting
 * to an ISO string. A ±12h shift to UTC never crosses a day boundary
 * for any real-world timezone, so the calendar day is preserved.
 */

/** Convert a Date (or y/m/d) to an ISO string representing local noon that day. */
export function toLocalNoonIso(input: Date | string): string {
  let d: Date;
  if (typeof input === 'string') {
    // Accept "YYYY-MM-DD" plain date strings without timezone shifting
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    } else {
      d = new Date(input);
    }
  } else {
    d = input;
  }
  if (isNaN(d.getTime())) return new Date().toISOString();
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  return noon.toISOString();
}

/** Convert a stored ISO string back to a "YYYY-MM-DD" value for <input type="date">, using LOCAL date parts. */
export function isoToDateInputValue(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date at local midnight, for use as a `disabled` matcher lower bound in date pickers. */
export function todayAtMidnight(): Date {
  return new Date(new Date().setHours(0, 0, 0, 0));
}

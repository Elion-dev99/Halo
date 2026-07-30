/** YYYY-MM-DD helpers (local calendar, no timezone shift via Date.UTC). */

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function periodName(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export interface MonthPeriodDraft {
  name: string;
  startDate: string;
  endDate: string;
}

/** 会計年度開始月から 12 ヶ月分の月次期間を生成 */
export function buildFiscalYearMonths(
  fiscalYearStartYear: number,
  fiscalYearStartMonth: number,
): MonthPeriodDraft[] {
  const periods: MonthPeriodDraft[] = [];
  for (let i = 0; i < 12; i += 1) {
    const monthIndex = fiscalYearStartMonth - 1 + i;
    const year = fiscalYearStartYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    periods.push({
      name: periodName(year, month),
      startDate: formatDate(year, month, 1),
      endDate: formatDate(year, month, lastDayOfMonth(year, month)),
    });
  }
  return periods;
}

/** 基準日が属する会計年度の開始年を返す（開始月が 4 なら 2026-07 → 2026） */
export function fiscalYearStartYearForDate(
  date: Date,
  fiscalYearStartMonth: number,
): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  if (month >= fiscalYearStartMonth) return year;
  return year - 1;
}

export function todayISO(date = new Date()): string {
  return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

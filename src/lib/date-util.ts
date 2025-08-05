import dayjs, { type Dayjs } from "dayjs";

export function categorizeDate(date: Dayjs): string {
  const now = dayjs();
  const today = now.startOf('day');
  const yesterday = now.subtract(1, "day").startOf('day');
  const oneWeekAgo = now.subtract(7, "day").startOf('day');
  const fifteenDaysAgo = now.subtract(15, "day").startOf('day');
  const thirtyDaysAgo = now.subtract(30, "day").startOf('day');

  if (date.isSame(today, "day")) {
    return "Hoje";
  }

  if (date.isSame(yesterday, "day")) {
    return "Ontem";
  }

  if (date.isAfter(oneWeekAgo)) {
    return "Última Semana";
  }

  if (date.isAfter(fifteenDaysAgo)) {
    return "Últimos 15 dias";
  }

  if (date.isAfter(thirtyDaysAgo)) {
    return "Últimos 30 dias";
  }

  return "Mais Antigo";
}

export function getRelativeTimeString(date: Dayjs): string {
  const now = dayjs();
  const diffInSeconds = now.diff(date, "seconds");

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
}

export function getTimeframeSortOrder(timeframe: string): number {
  const order: Record<string, number> = {
    Hoje: 1,
    Ontem: 2,
    "Última Semana": 3,
    "Últimos 15 dias": 4,
    "Últimos 30 dias": 5,
    "Mais Antigo": 6,
  };

  return order[timeframe] || 999;
}

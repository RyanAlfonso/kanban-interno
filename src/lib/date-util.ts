import dayjs, { type Dayjs } from "dayjs";

export function categorizeDate(date: Dayjs): string {
  const now = dayjs();
  const yesterday = now.subtract(1, "day").toDate();

  if (dayjs(date).isSame(now, "day")) {
    return "Today";
  }

  if (date.isSame(yesterday, "day")) {
    return "Yesterday";
  }

  // Check if the date is within this week
  const startOfWeek = dayjs().startOf("week").toDate();
  const endOfWeek = dayjs().endOf("week").toDate();

  if (date.isAfter(startOfWeek) && date.isBefore(endOfWeek)) {
    return "This Week";
  }

  // Check if the date is within the past 30 days
  const thirtyDaysAgo = dayjs().subtract(30, "day").toDate();
  if (date.isAfter(thirtyDaysAgo)) {
    return "Last 30 Days";
  }

  // Check if the date is within the last month
  const lastMonth = dayjs().subtract(1, "month").toDate();

  if (date.isAfter(lastMonth)) {
    return "Last Month";
  }

  // If the date is older than two months
  return "Older";
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
    Today: 1,
    Yesterday: 2,
    "This Week": 3,
    "Past 30 Days": 4,
    "Last Month": 5,
    "Two Months Ago": 6,
    Older: 7,
  };

  return order[timeframe] || 999;
}

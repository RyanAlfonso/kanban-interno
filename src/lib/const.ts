import { Todo } from "@prisma/client";

export const TASK_STATE_OPTIONS: Readonly<
  {
    value: Todo["state"];
    title: string;
  }[]
> = Object.freeze([
  {
    value: "TODO",
    title: "Todo",
  },
  {
    value: "IN_PROGRESS",
    title: "In Progress",
  },
  {
    value: "REVIEW",
    title: "Review",
  },
  {
    value: "DONE",
    title: "Done",
  },
]);

export const COLUMN_COLORS: Record<
  Todo["state"],
  { bg: string; header: string }
> = Object.freeze({
  TODO: {
    bg: "bg-blue-50 dark:bg-blue-950",
    header: "bg-blue-100 dark:bg-blue-900",
  },
  IN_PROGRESS: {
    bg: "bg-amber-50 dark:bg-amber-950",
    header: "bg-amber-100 dark:bg-amber-900",
  },
  REVIEW: {
    bg: "bg-purple-50 dark:bg-purple-950",
    header: "bg-purple-100 dark:bg-purple-900",
  },
  DONE: {
    bg: "bg-green-50 dark:bg-green-950",
    header: "bg-green-100 dark:bg-green-900",
  },
});

export const PROJECT_COLORS = [
  {
    bg: "bg-blue-500",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  {
    bg: "bg-purple-500",
    badge:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  {
    bg: "bg-green-500",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  {
    bg: "bg-teal-500",
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  },
  {
    bg: "bg-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  {
    bg: "bg-red-500",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  {
    bg: "bg-pink-500",
    badge: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  },
];

export const CLOCK_COLOR = [
  {
    bg: "bg-amber-100 dark:bg-amber-900",
    badge: "text-amber-600 dark:text-amber-400",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-900",
    badge: "text-rose-600 dark:text-rose-400",
  },
  {
    bg: "bg-fuchsia-100 dark:bg-fuchsia-900",
    badge: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    bg: "bg-indigo-100 dark:bg-indigo-900",
    badge: "text-indigo-600 dark:text-indigo-400",
  },
  {
    bg: "bg-cyan-100 dark:bg-cyan-900",
    badge: "text-cyan-600 dark:text-cyan-400",
  },
  {
    bg: "bg-sky-100 dark:bg-sky-900",
    badge: "text-sky-600 dark:text-sky-400",
  },
];

export const TIMEFRAMECOLOR: Record<string, string> = {
  Hoje: "bg-blue-500/10 text-blue-500 border-blue-500/20", // Blue for Today
  Ontem: "bg-purple-500/10 text-purple-500 border-purple-500/20", // Purple for Yesterday
  "Última Semana": "bg-green-500/10 text-green-500 border-green-500/20", // Green for Last Week
  "Últimos 15 dias": "bg-amber-500/10 text-amber-500 border-amber-500/20", // Amber for Last 15 days
  "Últimos 30 dias": "bg-orange-500/10 text-orange-500 border-orange-500/20", // Orange for Last 30 days
  "Mais Antigo": "bg-gray-500/10 text-gray-500 border-gray-500/20", // Gray for Older
};

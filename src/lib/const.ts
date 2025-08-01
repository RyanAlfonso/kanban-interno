// Path: kanban-interno/src/lib/const.ts
export const COLUMN_COLORS: Record<string, { bg: string; header: string }> = Object.freeze({
  "Backlog": {
    bg: "bg-slate-50 dark:bg-slate-950",
    header: "bg-slate-200 dark:bg-slate-800",
  },
  "Em Execução": {
    bg: "bg-blue-50 dark:bg-blue-950",
    header: "bg-blue-200 dark:bg-blue-900",
  },
  "Em Aprovação": {
    bg: "bg-amber-50 dark:bg-amber-950",
    header: "bg-amber-200 dark:bg-amber-900",
  },
  "Monitoramento": {
    bg: "bg-purple-50 dark:bg-purple-950",
    header: "bg-purple-200 dark:bg-purple-900",
  },
  "Concluída": {
    bg: "bg-green-50 dark:bg-green-950",
    header: "bg-green-200 dark:bg-green-900",
  },
  // Cor padrão para colunas que não correspondem a nenhuma das chaves acima.
  "default": {
    bg: "bg-gray-50 dark:bg-gray-950",
    header: "bg-gray-200 dark:bg-gray-800",
  }
});

// As constantes abaixo não apresentavam erro e foram mantidas.
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
  "Hoje": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Ontem": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Última Semana": "bg-green-500/10 text-green-500 border-green-500/20",
  "Últimos 15 dias": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Últimos 30 dias": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Mais Antigo": "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

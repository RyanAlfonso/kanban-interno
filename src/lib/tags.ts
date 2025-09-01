export interface TagColor {
  bg: string;
  text: string;
}

export const CUSTOM_TAG_COLORS: TagColor[] = [
  { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300" },
  { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-700 dark:text-yellow-300" },
  { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-cyan-100 dark:bg-cyan-900", text: "text-cyan-700 dark:text-cyan-300" },
  { bg: "bg-lime-100 dark:bg-lime-900", text: "text-lime-700 dark:text-lime-300" },
  { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-700 dark:text-teal-300" },
];

export const PRIORITY_TAG_COLOR: TagColor = {
  bg: "bg-red-100 dark:bg-red-900",
  text: "text-red-700 dark:text-red-300",
};

export const getTagColor = (colorName: string): TagColor => {
  switch (colorName) {
    case "#3B82F6": return { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-300" };
    case "#10B981": return { bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-300" };
    case "#F59E0B": return { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-700 dark:text-yellow-300" };
    case "#F97316": return { bg: "bg-orange-100 dark:bg-orange-900", text: "text-orange-700 dark:text-orange-300" };
    case "#8B5CF6": return { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-700 dark:text-purple-300" };
    case "#EC4899": return { bg: "bg-pink-100 dark:bg-pink-900", text: "text-pink-700 dark:text-pink-300" };
    case "#06B6D4": return { bg: "bg-cyan-100 dark:bg-cyan-900", text: "text-cyan-700 dark:text-cyan-300" };
    case "#84CC16": return { bg: "bg-lime-100 dark:bg-lime-900", text: "text-lime-700 dark:text-lime-300" };
    case "#6366F1": return { bg: "bg-indigo-100 dark:bg-indigo-900", text: "text-indigo-700 dark:text-indigo-300" };
    case "#14B8A6": return { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-700 dark:text-teal-300" };
    case "#EF4444": return PRIORITY_TAG_COLOR;
    default: return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" };
  }
};



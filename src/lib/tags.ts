export const PREDEFINED_TAGS = [
  "Bug",
  "Feature",
  "UI",
  "Backend",
  "Prioridade",
  "Documentação",
] as const;

export type PredefinedTag = (typeof PREDEFINED_TAGS)[number];

export interface TagColor {
  bg: string;
  text: string;
}

const tagColorPalette: TagColor[] = [
  {
    bg: "bg-purple-100 dark:bg-purple-900",
    text: "text-purple-700 dark:text-purple-300",
  },

  {
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-700 dark:text-blue-300",
  },

  {
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-700 dark:text-green-300",
  },

  {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
  },

  { bg: "bg-red-100 dark:bg-red-900", text: "text-red-700 dark:text-red-300" },

  {
    bg: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-700 dark:text-amber-300",
  },
];

const defaultTagColor: TagColor = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-700 dark:text-gray-300",
};

const tagColorCache = new Map<PredefinedTag, TagColor>();

export const getTagColor = (tagName: PredefinedTag): TagColor => {
  if (tagColorCache.has(tagName)) {
    return tagColorCache.get(tagName)!;
  }

  const index = PREDEFINED_TAGS.indexOf(tagName);
  const color =
    tagColorPalette[index % tagColorPalette.length] || defaultTagColor;

  tagColorCache.set(tagName, color);
  return color;
};

export const isValidTag = (tag: string): tag is PredefinedTag => {
  return PREDEFINED_TAGS.includes(tag as PredefinedTag);
};

export const getAllTagsWithColors = (): {
  name: PredefinedTag;
  colors: TagColor;
}[] => {
  return PREDEFINED_TAGS.map((tag) => ({
    name: tag,
    colors: getTagColor(tag),
  }));
};

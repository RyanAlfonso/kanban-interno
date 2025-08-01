export const PREDEFINED_TAGS = [
  "Bug",
  "Feature",
  "UI",
  "Backend",
  "Prioridade",
  "Documentação",
] as const;

export type PredefinedTag = typeof PREDEFINED_TAGS[number];

export interface TagColor {
  bg: string;
  text: string;
}

const tagColorPalette: TagColor[] = [
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-green-500", text: "text-white" },
  { bg: "bg-yellow-500", text: "text-black" },
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
];

const defaultTagColor: TagColor = { bg: "bg-gray-500", text: "text-white" };

// Cache for generated tag colors
const tagColorCache = new Map<PredefinedTag, TagColor>();

export const getTagColor = (tagName: PredefinedTag): TagColor => {
  if (tagColorCache.has(tagName)) {
    return tagColorCache.get(tagName)!;
  }

  const index = PREDEFINED_TAGS.indexOf(tagName);
  const color = tagColorPalette[index % tagColorPalette.length] || defaultTagColor;

  tagColorCache.set(tagName, color);
  return color;
};

export const isValidTag = (tag: string): tag is PredefinedTag => {
  return PREDEFINED_TAGS.includes(tag as PredefinedTag);
};

export const getAllTagsWithColors = (): { name: PredefinedTag; colors: TagColor }[] => {
  return PREDEFINED_TAGS.map(tag => ({
    name: tag,
    colors: getTagColor(tag),
  }));
};

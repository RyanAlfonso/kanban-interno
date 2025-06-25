import { CLOCK_COLOR, PROJECT_COLORS } from "./const";

const labelColorCache = new Map<string, { bg: string; badge: string }>();
const clockColorCache = new Map<
  string,
  {
    bg: string;
    badge: string;
  }
>();

const getHashValue = (str: string) => {
  let hashValue = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hashValue = (hashValue << 5) - hashValue + charCode;
    hashValue |= 0;
  }
  return Math.abs(hashValue);
};

export const getLabelColor = (label: string) => {
  if (labelColorCache.has(label)) return labelColorCache.get(label)!;

  const hashValue = getHashValue(label);

  const colorIndex = hashValue % PROJECT_COLORS.length;

  labelColorCache.set(label, PROJECT_COLORS[colorIndex]);
  return PROJECT_COLORS[colorIndex];
};

export const getClockColor = (taskName: string) => {
  if (clockColorCache.has(taskName)) return clockColorCache.get(taskName)!;

  const hashValue = getHashValue(taskName);

  const colorIndex = hashValue % CLOCK_COLOR.length;

  clockColorCache.set(taskName, CLOCK_COLOR[colorIndex]);
  return PROJECT_COLORS[colorIndex];
};

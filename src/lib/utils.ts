import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getEarilerDate(d1: number | undefined, d2: number | undefined) {
  if (typeof d1 === "undefined" && typeof d2 === "undefined") return undefined;
  if (typeof d1 === "undefined") return d2;
  if (typeof d2 === "undefined") return d1;
  return d1 < d2 ? d1 : d2;
}


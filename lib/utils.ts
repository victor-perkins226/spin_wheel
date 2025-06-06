import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNum(x: number): string {
  const s = x.toFixed(3);
  return s.replace(/\.?0+$/, '');
}


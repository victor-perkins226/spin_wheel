import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNum(x: number): string {
  const s = x.toFixed(3);
  return s.replace(/\.?0+$/, '');
}


export function formatNumInput(x: number): string {
  // round to 3 decimals, then parseFloat will drop trailing zeros
  return parseFloat(x.toFixed(3)).toString();
}
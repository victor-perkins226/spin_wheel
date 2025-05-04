import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


// Constants for round durations
export const ROUND_DURATION = {
  LIVE: 300,
  LOCK: 130,
};

export const roundMockData = [
  {
    id: 1,
    variant: "expired",
    status: "ENDED",
    lockPrice: 534.12,
    closePrice: 535.67,
    prizePool: 8.6015,
    timeRemaining: 0,
    liveBets: [],
    upBets: 0,
    downBets: 0,
    totalBets: 0,
    startTime:
      Date.now() - (ROUND_DURATION.LIVE + ROUND_DURATION.LOCK + 10) * 1000, // 10 seconds ago
    endTime: Date.now() - 10000, // 10 seconds ago
  },
  {
    id: 2,
    variant: "live",
    status: "LIVE",
    currentPrice: 535.67,
    prizePool: 5.4312,
    timeRemaining: ROUND_DURATION.LIVE,
    liveBets: [],
    upBets: 0,
    downBets: 0,
    totalBets: 0,
    startTime: Date.now(),
    endTime: Date.now() + ROUND_DURATION.LIVE * 1000,
  },
  {
    id: 3,
    variant: "next",
    status: "UPCOMING",
    prizePool: 0.1,
    timeRemaining: ROUND_DURATION.LIVE + ROUND_DURATION.LOCK,
    liveBets: [],
    upBets: 0,
    downBets: 0,
    totalBets: 0,
    startTime: Date.now() + ROUND_DURATION.LIVE * 1000,
    endTime:
      Date.now() + (ROUND_DURATION.LIVE * 2 + ROUND_DURATION.LOCK) * 1000,
  },
]
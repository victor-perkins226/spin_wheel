// types/round.ts
export interface Round {
    id?: number;
    number: number | string; // Handle string from API (e.g., "862")
    startTime: string | number;
    status: "started" | "locked" | "ended";
    lockTime?: number;
    closeTime?: number;
    lockPrice?: number;
    endPrice?: number;
    isActive?: boolean;
    totalBullAmount?: number;
    totalBearAmount?: number;
    totalAmount?: number;
    rewardBaseCalAmount?: number;
    rewardAmount?: number;
  }

export interface Config {
    roundDuration: number;
    currentRound: number;
    isPaused: boolean;
    minBetAmount: number;
    treasuryFee: number;
    lockDuration: number;
    bufferSeconds: number;
    genesisStarted: boolean;
    genesisLocked: boolean;
}

export interface UserBet {
    roundId: number;
    direction: "up" | "down";
    status: "WON" | "LOST" | "PENDING";
    amount: number;
    payout:number
}
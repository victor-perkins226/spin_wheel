import { BN } from "@project-serum/anchor";

// types/round.ts
export interface Round {
    id?: number;
    number: number | string; // Handle string from API (e.g., "862")
    startTime: Date | number | null;
    status: "started" | "locked" | "ended";
    lockTime: Date | number | undefined;
    closeTime: Date | number | undefined;
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
    id: string; // Added for BetsHistory
    roundId: number;
    direction: 'up' | 'down';
    status: 'WON' | 'LOST' | 'PENDING' | 'CLAIMED';
    amount: number;
    payout: number;
  
}


export interface ClaimableBet {
    roundNumber: number;
    amount: number;
    predictBull: boolean;
    payout: number;
   
}

export interface UserBetAccount {
    roundNumber: BN; // Anchor BN for u64
    predictBull: boolean;
    amount: BN; // Anchor BN for u64
    claimed: boolean;
}
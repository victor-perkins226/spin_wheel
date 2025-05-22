import { BN } from "@project-serum/anchor";

// types/round.ts
export interface Round {
    number: number;
    startTime: string; // ISO string for Date
    status: "started" | "locked" | "ended";
    lockTime: number; // Unix timestamp (seconds)
    closeTime: number; // Unix timestamp (seconds)
    lockPrice: string; // String to handle large u64 numbers
    endPrice: string; // String to handle large u64 numbers
    isActive: boolean;
    totalBullAmount: string; // String for u64
    totalBearAmount: string; // String for u64
    totalAmount: string; // String for u64
    rewardBaseCalAmount: string; // String for u64
    rewardAmount: string; // String for u64
  }

  export interface Config {
    operatorMultisig: string; // PublicKey as string
    adminMultisig: string; // PublicKey as string
    admin: string; // PublicKey as string
    executor: string; // PublicKey as string
    roundDuration: number; // u64 as number (assuming it fits in JS number)
    minBetAmount: string; // u64 as string for large numbers
    treasuryFee: number; // u64 as number (assuming it fits)
    lockDuration: number; // u64 as number
    treasuryAmount: string; // u64 as string
    currentRound: number; // u64 as number
    isPaused: boolean;
    bufferSeconds: number; // u64 as number
    genesisStarted: boolean;
    genesisLocked: boolean;
    bump: number; // u8 as number
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
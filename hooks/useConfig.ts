/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import axios from "axios";
import { Config, Round } from "@/types/round";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { PROGRAM_ID } from "@/lib/config";


const programId = new PublicKey(PROGRAM_ID);


interface PreviousRoundsResponse {
    rounds: Round[];
    total: number; 
}

export const fetchConfig = async (program: any): Promise<Config> => {
    if (!program) {
        throw new Error("Program is not initialized");
    }
    const configPda = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    )[0];

    const config = await program.account.config.fetch(configPda);
    return {
        operatorMultisig: config.operatorMultisig.toString(),
        adminMultisig: config.adminMultisig.toString(),
        admin: config.admin.toString(),
        executor: config.executor.toString(),
        roundDuration: Number(config.roundDuration),
        minBetAmount: config.minBetAmount.toString(),
        treasuryFee: Number(config.treasuryFee),
        lockDuration: Number(config.lockDuration),
        treasuryAmount: config.treasuryAmount.toString(),
        currentRound: Number(config.currentRound),
        isPaused: config.isPaused,
        bufferSeconds: Number(config.bufferSeconds),
        genesisStarted: config.genesisStarted,
        genesisLocked: config.genesisLocked,
        bump: config.bump,
    };
};

export const useConfig = () => {
    const { program } = useProgram();

    return useQuery({
        queryKey: ["config"],
        queryFn: () => fetchConfig(program),
        enabled: !!program,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchInterval: 5000, // Refetch every 1 second
        retry: (failureCount, error) => {
            console.error("Error fetching config:", error);
            return failureCount < 3;
        },
    });
};

const fetchRound = async (program: any, roundNumber: number): Promise<Round> => {
    const roundPda = PublicKey.findProgramAddressSync(
        [Buffer.from("round"), new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8)],
        programId
    )[0];

    const round = await program.account.round.fetch(roundPda);
 
    const startTime = Number(round.startTime);
    const lockTime = Number(round.lockTime);
    const closeTime = Number(round.closeTime);
    return {
        number: Number(round.number),
        startTime: new Date(startTime * 1000).toISOString(),
        status: round.isActive
            ? "started"
            : round.endPrice && !round.isActive
                ? "ended"
                : "locked",
        lockTime,
        closeTime,
        lockPrice: round.lockPrice.toString(),
        endPrice: round.endPrice.toString(),
        isActive: round.isActive,
        totalBullAmount: round.totalBullAmount.toString(),
        totalBearAmount: round.totalBearAmount.toString(),
        totalAmount: round.totalAmount.toString(),
        rewardBaseCalAmount: round.rewardBaseCalAmount.toString(),
        rewardAmount: round.rewardAmount.toString(),
    };
};

// hooks/useConfig.ts - Update the useRound hook
export const useRound = (roundNumber?: number) => {
    const { program } = useProgram();

    return useQuery({
        queryKey: ["round", roundNumber],
        queryFn: () => fetchRound(program, roundNumber!),
        enabled: !!program && !!roundNumber && !isNaN(roundNumber) && roundNumber > 0,
        staleTime: (query) => {
            const roundData = query?.state?.data;
            // For ended rounds, cache indefinitely
            if (roundData && roundData.status === "ended") {
                return Infinity;
            }
            return 30 * 1000; // 30 seconds for active rounds
        },
        refetchInterval: (query) => {
            const roundData = query?.state?.data;
            if (!roundData) return false;
            
            // Don't refetch ended rounds
            if (roundData.status === "ended") {
                return false;
            }
            
            const now = Date.now() / 1000;
            const lockTime = roundData.lockTime || new Date(roundData.startTime).getTime() / 1000 + 300;
            const closeTime = Number(roundData.closeTime);
            
            // If round is completely over, don't refetch
            if (now >= closeTime) {
                return false;
            }
            
            // More frequent updates only for active rounds near lock/close time
            if (now >= lockTime) {
                return 5 * 1000; // 5 seconds during calculating phase
            } else if (lockTime - now <= 60) {
                return 10 * 1000; // 10 seconds in the last minute before lock
            } else {
                return 30 * 1000; // 30 seconds for regular betting phase
            }
        },
        retry: (failureCount, error: any) => {
            if (error?.message?.includes("Account does not exist")) return false;
            return failureCount < 2;
        },
    });
};

export const getRoundOutcome = (round: Round) => {
    if (!round.endPrice || !round.lockPrice) return "PENDING";
    return round.endPrice > round.lockPrice ? "UP" : round.endPrice < round.lockPrice ? "DOWN" : "TIE";
};

const fetchRoundById = async (program: any, roundNumber: number): Promise<Round | null> => {
    const roundPda = PublicKey.findProgramAddressSync(
        [Buffer.from("round"), new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8)],
        programId
    )[0];

    try {
        const round = await program.account.round.fetch(roundPda);
        const startTime = Number(round.startTime);
        const lockTime = Number(round.lockTime);
        const closeTime = Number(round.closeTime);

        return {
            number: Number(round.number),
            startTime: new Date(startTime * 1000).toISOString(),
            status: round.isActive
                ? "started"
                : round.endPrice && !round.isActive
                    ? "ended"
                    : "locked",
            lockTime,
            closeTime,
            lockPrice: round.lockPrice.toString(),
            endPrice: round.endPrice.toString(),
            isActive: round.isActive,
            totalBullAmount: round.totalBullAmount.toString(),
            totalBearAmount: round.totalBearAmount.toString(),
            totalAmount: round.totalAmount.toString(),
            rewardBaseCalAmount: round.rewardBaseCalAmount.toString(),
            rewardAmount: round.rewardAmount.toString(),
        };
    } catch (error: any) {
        if (error.message.includes("Account does not exist")) {
            return null; // Round doesn’t exist
        }
        console.error(`Failed to fetch round ${roundNumber}:`, error);
        throw error;
    }
};

const shouldCacheLongTerm = (roundData: any): boolean => {
    if (!roundData) return false;
    
    const now = Date.now() / 1000;
    const closeTime = Number(roundData.closeTime);
    
    return (
        roundData.status === "ended" || 
        now >= closeTime
    );
};
// hooks/useConfig.ts - Update usePreviousRoundsByIds
export const usePreviousRoundsByIds = (currentRound?: number, count: number = 5, offset: number = 0) => {
    const { program } = useProgram();
    const queryClient = useQueryClient();

    // queryClient.invalidateQueries({
    //     queryKey: ["previousRounds"],
    //     exact: false, // Invalidate all queries that start with this key
    // });
    return useQuery({
        queryKey: ["previousRounds", currentRound, count, offset],
        queryFn: async (): Promise<PreviousRoundsResponse> => {
            if (!program || !currentRound || currentRound <= 1) {
                return { rounds: [], total: 0 };
            }

            const roundNumbers = Array.from(
                { length: Math.min(count, currentRound - 1 - offset) },
                (_, i) => currentRound - 1 - offset - i
            ).filter((num) => num > 0);

            // Use queryClient.fetchQuery to leverage the caching from useRound
            const rounds = await Promise.all(
                roundNumbers.map(async (roundNumber) => {
                    try {
                        queryClient.invalidateQueries({
                            queryKey: ["round", roundNumber],
                            exact: false,
                        });
                        return await queryClient.fetchQuery({
                            queryKey: ["round", roundNumber],
                            queryFn: () => fetchRound(program, roundNumber),
                            staleTime: 2 * 60 * 1000, // 2 minutes cache for historical rounds
                        });
                    } catch (error) {
                        console.error(`Failed to fetch round ${roundNumber}:`, error);
                        return null;
                    }
                })
            );
            const validRounds = rounds.filter((round): round is Round => round !== null);

            return {
                rounds: validRounds.sort((a, b) => b.number - a.number),
                total: validRounds.length,
            };
        },
        enabled: !!program && !!currentRound && currentRound > 1 && !isNaN(currentRound),
        staleTime: 2 * 60 * 1000, // Cache for 2 minutes
        refetchInterval: (query) => {
            const roundsData = query?.state?.data?.rounds;
            const isEndPriceSatisfied = roundsData?.[1]?.endPrice && Number(roundsData[1].endPrice) > 0;

            return isEndPriceSatisfied ? 30000 : 1000; // Retry every 5 seconds until endPrice is valid
        },
        retry: (failureCount, error: any) => {
            if (error?.message?.includes("Account does not exist")) return false;
            return failureCount < 2; // Reduced retries
        },
    });
};

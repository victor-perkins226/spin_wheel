/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
// import axios from "axios";
import { Config, Round } from "@/types/round";
import { useProgram } from "./useProgram";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";



const programId = new PublicKey("AKui3UEpyUEhtnqsDChTL76DFncYx6rRqp6CSShnUm9r");



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
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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

export const useRound = (roundNumber?: number) => {
    const { program } = useProgram();

    return useQuery({
        queryKey: ["round", roundNumber],
        queryFn: () => fetchRound(program, roundNumber!),
        enabled: !!program && !!roundNumber && !isNaN(roundNumber) && roundNumber > 0,
        staleTime: 30 * 1000,
        refetchInterval: (data) => {
            if (!data) return false;
            const now = Date.now() / 1000;
            const lockTime = data.lockTime || new Date(data.startTime).getTime() / 1000 + 300;
            return now >= lockTime ? 5 * 1000 : 10 * 1000;
        },
        retry: (failureCount, error: any) => {
            if (error.message.includes("Account does not exist")) return false; // Don’t retry on missing account
            console.error(`Error fetching round ${roundNumber}:`, error);
            return failureCount < 3;
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

export const usePreviousRoundsByIds = (currentRound?: number, count: number = 5, offset: number = 0) => {
    const { program } = useProgram();

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

            console.log(`Fetching rounds: ${roundNumbers.join(", ")}`);

            const rounds = await Promise.all(
                roundNumbers.map((roundNumber) => fetchRoundById(program, roundNumber))
            );

            const validRounds = rounds.filter((round): round is Round => round !== null);

            return {
                rounds: validRounds.sort((a, b) => b.number - a.number),
                total: validRounds.length,
            };
        },
        enabled: !!program && !!currentRound && currentRound > 1 && !isNaN(currentRound),
        staleTime: 2 * 60 * 1000,
        onSuccess: (data: PreviousRoundsResponse) => {
            console.log(
                `Fetched ${data.rounds.length} previous rounds:`,
                data.rounds.map((r) => ({ number: r.number, endPrice: r.endPrice }))
            );
        },
        onError: (error: any) => {
            console.error("Error fetching previous rounds:", error);
        },
        retry: (failureCount, error: any) => {
            if (error.message.includes("Account does not exist")) return false;
            return failureCount < 3;
        },
    });
};

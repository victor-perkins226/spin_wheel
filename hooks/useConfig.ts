import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sol-prediction-backend.onrender.com/round';

interface Config {
    roundDuration: number; // u64
    currentRound: number; // u64
    isPaused: boolean;
    minBetAmount: number; // u64
    treasuryFee: number; // u64
    lockDuration: number; // u64
    bufferSeconds: number; // u64
    genesisStarted: boolean;
    genesisLocked: boolean;
    // Other fields as needed
}

interface Round {
    number: number; // u64
    startTime: number; // i64 (Unix timestamp)
    lockTime: number; // i64
    closeTime: number; // i64
    lockPrice: number; // u64
    endPrice: number; // u64
    isActive: boolean;
    totalBullAmount: number; // u64
    totalBearAmount: number; // u64
    totalAmount: number; // u64
    rewardBaseCalAmount: number; // u64
    rewardAmount: number; // u64
}

// New hook for fetching previous rounds
interface PreviousRoundsResponse {
    rounds: Round[];
    total: number; // Total number of rounds for pagination
}

const fetchConfig = async (): Promise<Config> => {
    const response = await axios.get(`${API_URL}/config`);
    return response.data;
};

export const useConfig = () => {
    return useQuery({
        queryKey: ["config"],
        queryFn: fetchConfig,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    });
};

const fetchRound = async (roundNumber: number): Promise<Round> => {
    const response = await axios.get(`${API_URL}/${roundNumber}`);
    return response.data;
};

export const useRound = (roundNumber: number | undefined) => {
    return useQuery({
        queryKey: ["round", roundNumber],
        queryFn: () => fetchRound(roundNumber!),
        enabled: !!roundNumber && roundNumber > 0, // Only fetch if valid
        staleTime: 30 * 1000, // Cache for 30 seconds
        refetchInterval: (data) => {
            if (!data) return false;
            const now = Date.now() / 1000;
            if (now >= data.closeTime) return false; // Stop polling after close
            if (now < data.lockTime) return 10 * 1000; // Poll every 10s during betting
            return 30 * 1000; // Poll every 30s after lock
        },
    });
};

const fetchPreviousRounds = async (
    currentRound: number,
    limit: number = 10,
    offset: number = 0
): Promise<PreviousRoundsResponse> => {
    const response = await axios.get("/api/rounds", {
        params: { limit, offset, maxRound: currentRound - 1 },
    });
    return response.data;
};

export const usePreviousRounds = (
    currentRound: number | undefined,
    limit: number = 10,
    offset: number = 0
) => {
    return useQuery({
        queryKey: ["previousRounds", currentRound, limit, offset],
        queryFn: () => fetchPreviousRounds(currentRound!, limit, offset),
        enabled: !!currentRound && currentRound > 1, // Only fetch if there are previous rounds
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        refetchInterval: false, // No polling, refetch when currentRound changes
    });
};
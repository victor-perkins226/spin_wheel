/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Config, Round } from "@/types/round";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sol-prediction-backend.onrender.com/round';




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
    const response = await axios.get(`https://sol-prediction-backend.onrender.com/round/${roundNumber}`);
    const data = response.data;
    return {
        number: Number(data.number || data.roundNumber),
        startTime: typeof data.startTime === "string" && !isNaN(Number(data.startTime))
            ? new Date(Number(data.startTime) * 1000).toISOString()
            : data.startTime,
        status: data.status || (data.isActive ? "started" : data.endPrice ? "ended" : "locked"),
        lockTime: data.lockTime || new Date(data.startTime).getTime() / 1000 + 300,
        closeTime: data.closeTime || new Date(data.startTime).getTime() / 1000 + 450,
        lockPrice: data.lockPrice || 50 * 1e8,
        endPrice: data.endPrice || 0,
        isActive: data.isActive ?? data.status === "started",
        totalBullAmount: data.totalBullAmount || 0,
        totalBearAmount: data.totalBearAmount || 0,
        totalAmount: data.totalAmount || 0,
        rewardBaseCalAmount: data.rewardBaseCalAmount || 0,
        rewardAmount: data.rewardAmount || 0,
    };
};

export const useRound = (roundNumber?: number) => {
    return useQuery({
        queryKey: ["round", roundNumber],
        queryFn: () => fetchRound(roundNumber!),
        enabled: !!roundNumber && !isNaN(roundNumber),
        staleTime: 30 * 1000,
        refetchInterval: (data) => {
            if (!data) return false;
            const now = Date.now() / 1000;
            const lockTime = data.lockTime || new Date(data.startTime).getTime() / 1000 + 300;
            return now >= lockTime ? 5 * 1000 : 10 * 1000;
        },
    });
};

export const fetchPreviousRounds = async (
    currentRound: number,
    limit: number = 5,
    offset: number = 0
): Promise<PreviousRoundsResponse> => {
    const response = await axios.get("https://sol-prediction-backend.onrender.com/rounds", {
        params: { limit, offset, maxRound: currentRound - 1 },
    });
    // Map and deduplicate by number
    const roundMap = new Map<number, Round>();
    response.data.forEach((r: any) => {
        const roundNumber = Number(r.roundNumber || r.number);
        if (!roundMap.has(roundNumber)) {
            roundMap.set(roundNumber, {
                id: r.id,
                number: roundNumber,
                startTime: r.startTime,
                status: r.status,
                lockTime: r.lockTime || new Date(r.startTime).getTime() / 1000 + 300,
                closeTime: r.closeTime || new Date(r.startTime).getTime() / 1000 + 450,
                lockPrice: r.lockPrice || 50 * 1e8,
                endPrice: r.endPrice || 0,
                isActive: r.status === "started",
                totalBullAmount: r.totalBullAmount || 0,
                totalBearAmount: r.totalBearAmount || 0,
                totalAmount: r.totalAmount || 0,
                rewardBaseCalAmount: r.rewardBaseCalAmount || 0,
                rewardAmount: r.rewardAmount || 0,
            });
        }
    });
    // Sort descending and take top 5
    const sortedRounds = Array.from(roundMap.values())
        .sort((a, b) => Number(b.number) - Number(a.number))
        .slice(0, limit);
    return {
        rounds: sortedRounds,
        total: response.data.length,
    };
};


export const usePreviousRounds = (
    currentRound?: number,
    limit: number = 5,
    offset: number = 0
) => {
    return useQuery({
        queryKey: ["previousRounds", currentRound, limit, offset],
        queryFn: () => fetchPreviousRounds(currentRound!, limit, offset),
        enabled: !!currentRound && currentRound > 1 && !isNaN(currentRound),
        staleTime: 2 * 60 * 1000, // Cache for 5 minute
        
    });
};

export const getRoundOutcome = (round: Round) => {
    if (!round.endPrice || !round.lockPrice) return "PENDING";
    return round.endPrice > round.lockPrice ? "UP" : round.endPrice < round.lockPrice ? "DOWN" : "TIE";
};
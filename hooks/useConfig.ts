/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Config, Round } from "@/types/round";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sol-prediction-backend.onrender.com/round';


interface PreviousRoundsResponse {
    rounds: Round[];
    total: number; 
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

export const fetchRound = async (roundNumber: number): Promise<Round> => {
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
        // retry: (failureCount, error) => {
        //     if (error.status === 404) return false; // Don't retry on 404
        //     return failureCount < 3;
        // },
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
    const maxRound = currentRound - 1;
    const response = await axios.get("https://sol-prediction-backend.onrender.com/rounds", {
        params: { limit, offset, maxRound },
    });

    // console.log('Raw API Response:', response.data);

    const rounds = response.data.rounds.map((r: any) => {
        const roundNumber = r.roundNumber || r.number; // Fallback to r.number if roundNumber is undefined
        if (!roundNumber || isNaN(Number(roundNumber))) {
            console.error(`Invalid roundNumber for round ${r.id}:`, roundNumber);
        }
        return {
            id: r.id,
            number: Number(roundNumber) || 0, // Fallback to 0 if invalid
            startTime: r.startTime ? new Date(r.startTime * 1000) : null, // Keep as Date
            status: r.status,
            lockTime: r.lockTime ? new Date(r.lockTime * 1000) : null,
            closeTime: r.closeTime ? new Date(r.closeTime * 1000) : null,
            lockPrice: r.lockPrice || "0",
            endPrice: r.endPrice || "0",
            isActive: r.isActive,
            totalBullAmount: r.totalBullAmount || "0",
            totalBearAmount: r.totalBearAmount || "0",
            totalAmount: r.totalAmount || "0",
            rewardBaseCalAmount: r.rewardBaseCalAmount || "0",
            rewardAmount: r.rewardAmount || "0",
        };
    });


    return {
        rounds,
        total: response.data.total,
    };
};
// Sort descending and take top 5
// const sortedRounds = Array.from(roundMap.values())
//     .sort((a, b) => Number(b.number) - Number(a.number))
//     .slice(0, limit);
// return {
//     rounds: sortedRounds,
//     total: response.data.length,
// };
// };

// types/round.ts (or wherever your shared types live)
  
export const usePreviousRounds = (
    currentRound?: number,
    limit: number = 5,
    offset: number = 0
) => {
    return useQuery<PreviousRoundsResponse>({
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

export const fetchRoundById = async (roundNumber: number): Promise<Round> => {
    try {
        const response = await axios.get(`https://sol-prediction-backend.onrender.com/round/${roundNumber}`);
        const r = response.data;
        // console.log(`Raw Round Response for ${roundNumber}:`, r);
        // Validate roundNumber
        const number = Number(r.number);
        // console.log('number',number);
        
        if (isNaN(number) || number <= 0) {
            console.error(`Invalid roundNumber for round ${roundNumber}:`, Number(r.roundNumber));
            throw new Error(`Invalid roundNumber: ${r.roundNumber}`);
        }
        // console.log(`Raw Round Response for ${roundNumber}:`, r);
        return {
            number: number,
            startTime: r.startTime ? r.startTime : null,
            status: r.status || 'unknown',
            lockTime: r.lockTime ? r.lockTime : null,
            closeTime: r.closeTime ? r.closeTime : null,
            lockPrice: r.lockPrice || '0',
            endPrice: r.endPrice || '0',
            isActive: r.isActive ?? false,
            totalBullAmount: r.totalBullAmount || '0',
            totalBearAmount: r.totalBearAmount || '0',
            totalAmount: r.totalAmount || '0',
            rewardBaseCalAmount: r.rewardBaseCalAmount || '0',
            rewardAmount: r.rewardAmount || '0',
        };
    } catch (error) {
        console.error(`Failed to fetch round ${roundNumber}:`, error);
        throw error; // Let useQuery handle retries

    }


};

export const usePreviousRoundsByIds = (currentRound?: number, count: number = 5, offset: number = 0) => {
    return useQuery({
        queryKey: ['previousRounds', currentRound, count, offset],
        queryFn: async (): Promise<PreviousRoundsResponse> => {
            if (!currentRound || currentRound <= 1) {
                return { rounds: [], total: 0 };
            }

            // Calculate round numbers to fetch: currentRound - 1 - offset, ..., up to count
            const roundNumbers = Array.from(
                { length: Math.min(count, currentRound - 1 - offset) },
                (_, i) => currentRound - 1 - offset - i
            ).filter((num) => num > 0); // Ensure no negative or zero round numbers
            console.log(`Fetching rounds: ${roundNumbers.join(', ')}`);

            // Fetch rounds in parallel
            const rounds = await Promise.all(
                roundNumbers.map(async (roundNumber) => {
                    try {
                        return await fetchRoundById(roundNumber);
                    } catch (error) {
                        console.error(`Failed to fetch round ${roundNumber}:`, error);
                        return null;
                    }
                })
            );

            // Filter out null results (failed fetches)
            const validRounds = rounds.filter((round): round is Round => round !== null);

            return {
                rounds: validRounds.sort((a, b) => Number(b.number) - Number(a.number)), // Sort descending
                total: validRounds.length, // Total is approximate since we don't know the full count
            };
        },
        enabled: !!currentRound && currentRound > 1 && !isNaN(currentRound),
        staleTime: 2 * 60 * 1000, // 2 minutes
        onSuccess: (data: { rounds: any[]; }) => {
            console.log(`Fetched ${data.rounds.length} previous rounds:`, data.rounds.map((r: { number: any; endPrice: any; }) => ({ number: r.number, endPrice: r.endPrice })));
        },
        onError: (error: any) => {
            console.error('Error fetching previous rounds:', error);
        },
    });
};

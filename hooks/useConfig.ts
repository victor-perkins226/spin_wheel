/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { Config, Round } from "@/types/round";
import { useEffect } from "react";

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
        staleTime: 30 * 1000,
        refetchInterval: (query) => {
            const data = query.state.data as Round | undefined;
            if (!data) return false;
            const now = Date.now() / 1000;
            const lockTime = typeof data.lockTime === 'number' 
                ? data.lockTime 
                : (data.startTime ? (new Date(data.startTime).getTime() / 1000 + 300) : 0);
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

    const rounds = response.data.rounds.map((r: any) => {
        const roundNumber = r.roundNumber || r.number;
        if (!roundNumber || isNaN(Number(roundNumber))) {
            console.error(`Invalid roundNumber for round ${r.id}:`, roundNumber);
        }
        return {
            id: r.id,
            number: Number(roundNumber) || 0,
            startTime: r.startTime ? new Date(r.startTime * 1000) : null,
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

const fetchWithRetry = async (url: string, options: any = {}, retries = 3, delay = 1000) => {
    try {
        return await axios.get(url, options);
    } catch (error: any) {
        if (retries <= 0 || (error.response && error.response.status === 404)) {
            throw error;
        }
        
        console.log(`Retrying fetch (${retries} attempts left) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
};

export const fetchRoundById = async (roundNumber: number): Promise<Round> => {
    try {
        const response = await fetchWithRetry(
            `${API_URL}/${roundNumber}`,
            {},
            3,
            1000
        );
        
        const r = response.data;
        const number = Number(r.number || r.roundNumber);
        
        if (isNaN(number) || number <= 0) {
            console.error(`Invalid roundNumber for round ${roundNumber}:`, number);
            throw new Error(`Invalid roundNumber: ${r.number || r.roundNumber}`);
        }

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
    } catch (error: any) {
        const status = error.response?.status;
        console.error(`Failed to fetch round ${roundNumber} (status ${status}):`, 
            error.message || error);
        throw error;
    }
};

export const usePreviousRoundsByIds = (currentRound?: number, count: number = 5, offset: number = 0) => {
    return useQuery<PreviousRoundsResponse, Error>({
        queryKey: ['previousRounds', currentRound, count, offset],
        queryFn: async (): Promise<PreviousRoundsResponse> => {
            if (!currentRound || currentRound <= 1) {
                return { rounds: [], total: 0 };
            }

            const roundNumbers = Array.from(
                { length: Math.min(count, currentRound - 1 - offset) },
                (_, i) => currentRound - 1 - offset - i
            ).filter((num) => num > 0);
            
            console.log(`Preparing to fetch rounds: ${roundNumbers.join(', ')}`);
            
            const chunkSize = 3;
            const roundChunks = [];
            
            for (let i = 0; i < roundNumbers.length; i += chunkSize) {
                roundChunks.push(roundNumbers.slice(i, i + chunkSize));
            }
            
            const validRounds: Round[] = [];
            
            for (const chunk of roundChunks) {
                console.log(`Fetching chunk: ${chunk.join(', ')}`);
                
                const chunkResults = await Promise.allSettled(
                    chunk.map(roundNumber => fetchRoundById(roundNumber))
                );
                
                chunkResults.forEach((result, idx) => {
                    if (result.status === 'fulfilled') {
                        validRounds.push(result.value);
                    } else {
                        console.error(`Failed to fetch round ${chunk[idx]}: ${result.reason}`);
                    }
                });
                
                if (roundChunks.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }

            return {
                rounds: validRounds.sort((a, b) => Number(b.number) - Number(a.number)),
                total: validRounds.length,
            };
        },
        enabled: !!currentRound && currentRound > 1 && !isNaN(currentRound),
        staleTime: 2 * 60 * 1000,
        retry: (failureCount, error: any) => {
            if (error.response?.status === 404) return false;
            return failureCount < 2;
        },
    });
};

export const usePreviousRoundsWithCallbacks = (
    currentRound?: number, 
    count: number = 5, 
    offset: number = 0,
    onSuccess?: (data: PreviousRoundsResponse) => void,
    onError?: (error: Error) => void
) => {
    const query = usePreviousRoundsByIds(currentRound, count, offset);
    
    useEffect(() => {
        if (query.data && onSuccess) {
            onSuccess(query.data);
            console.log(`Successfully fetched ${query.data.rounds.length} previous rounds`);
        }
    }, [query.data, onSuccess]);
    
    useEffect(() => {
        if (query.error && onError) {
            onError(query.error);
            console.error('Error fetching previous rounds:', query.error.message || query.error);
        }
    }, [query.error, onError]);
    
    return query;
};

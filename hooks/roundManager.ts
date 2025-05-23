import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useConfig, useRound, getRoundOutcome, usePreviousRoundsByIds, fetchConfig } from "./useConfig";
import { useQueryClient } from "@tanstack/react-query";
import { Round } from "@/types/round";
import { useSolPredictor } from "./useBuyClaim";
import { useProgram } from "./useProgram";

export const useRoundManager = (initialLimit: number = 5, initialOffset: number = 0) => {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(initialOffset);
  const [allPreviousRounds, setAllPreviousRounds] = useState<Round[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { fetchUserBets } = useSolPredictor();
  const { program, error: programError } = useProgram();
  const { data: config, isLoading: isConfigLoading, error: configError } = useConfig();
  const currentRoundNumber = config?.currentRound ? Number(config.currentRound) : undefined;
  const { data: currentRound, isLoading: isCurrentRoundLoading, error: roundError } = useRound(currentRoundNumber);
  const { data: previousRoundsData, isLoading: isPreviousRoundsLoading } = usePreviousRoundsByIds(
    currentRoundNumber,
    initialLimit,
    offset
  );

  const calculateTimeLeft = () => {
    if (!currentRound || !config?.lockDuration || isCurrentRoundLoading) {
      setTimeLeft(null);
      setIsLocked(false);
      return;
    }
  
    const now = Date.now() / 1000;
    const lockTime = currentRound.lockTime 
      ? Number(currentRound.lockTime)
      : (Number(currentRound.startTime) + Number(config.lockDuration));
    const closeTime = Number(currentRound.closeTime);
    
    const timeToLock = lockTime - now;
    const timeToClose = closeTime - now;
    
    if (timeToClose <= 0) {
      setTimeLeft(0);
      setIsLocked(true);
      return;
    }
    
    if (timeToLock <= 0 && timeToClose > 0) {
      const calculatingTimeLeft = Math.floor(timeToClose);
      setTimeLeft(calculatingTimeLeft);
      setIsLocked(true);
      return;
    }
    
    if (timeToLock > 0) {
      setTimeLeft(Math.floor(timeToLock));
      setIsLocked(false);
      return;
    }
  };

  const getRoundStatus = (roundData: any) => {
    if (!roundData) return "ENDED";
    
    const now = Date.now() / 1000;
    const lockTime = Number(roundData.lockTime);
    const closeTime = Number(roundData.closeTime);
    
    if (roundData.status === "ENDED" || roundData.status === "EXPIRED" || now >= closeTime) {
      return "ENDED";
    }
    
    if (now >= lockTime && now < closeTime) {
      return "CALCULATING";
    }
    
    if (lockTime - now <= 5 && lockTime - now > 0) {
      return "LOCKING";
    }
    
    return "LIVE";
  };

  const getTimerDisplay = (roundData: any) => {
    const now = Date.now() / 1000;
    const lockTime = Number(roundData.lockTime);
    const closeTime = Number(roundData.closeTime);
    
    if (now >= closeTime || roundData.status === "ENDED") {
      return "Ended";
    }
    
    if (now >= lockTime && now < closeTime) {
      const calculatingTime = Math.floor(closeTime - now);
      const minutes = Math.floor(calculatingTime / 60);
      const seconds = calculatingTime % 60;
      return `Calculating ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (lockTime - now <= 5 && lockTime - now > 0) {
      const lockingTime = Math.floor(lockTime - now);
      return `Locking in ${lockingTime}s`;
    }
    
    const timeToLock = Math.floor(lockTime - now);
    const minutes = Math.floor(timeToLock / 60);
    const seconds = timeToLock % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!currentRound || !config?.lockDuration || isCurrentRoundLoading) {
      setTimeLeft(null);
      setIsLocked(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
  
    const calculateTimeLeft = () => {
      const now = Date.now() / 1000;
      
      let startTimeMs: number;
      if (currentRound.startTime instanceof Date) {
        startTimeMs = currentRound.startTime.getTime();
      } else if (typeof currentRound.startTime === "string") {
        const numStartTime = Number(currentRound.startTime);
        startTimeMs = !isNaN(numStartTime) ? numStartTime * 1000 : Date.now();
      } else {
        startTimeMs = Number(currentRound.startTime) * 1000;
      }
      
      let lockTimeValue = currentRound.lockTime !== undefined && currentRound.lockTime !== null
        ? Number(currentRound.lockTime)
        : startTimeMs / 1000 + config.lockDuration;
  
      const closeTimeValue = Number(currentRound.closeTime);
      
      const timeToLock = lockTimeValue - now;
      const timeToClose = closeTimeValue - now;
  
      if (timeToClose <= 0) {
        setTimeLeft(0);
        setIsLocked(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (timeToLock <= 0 && timeToClose > 0) {
        setTimeLeft(Math.floor(timeToClose));
        setIsLocked(true);
      } else if (timeToLock > 0) {
        setTimeLeft(Math.floor(timeToLock));
        setIsLocked(false);
      }
    };
  
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  
    calculateTimeLeft();
  
    intervalRef.current = setInterval(calculateTimeLeft, 1000);
  
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentRound, config?.lockDuration, isCurrentRoundLoading, currentRoundNumber]);

  useEffect(() => {
    if (programError) console.error("useProgram Error:", programError);
    if (configError) console.error("useConfig Error:", configError);
    if (roundError) console.error("useRound Error:", roundError);
  }, [programError, configError, roundError]);

  const previousRounds = typeof previousRoundsData === 'object' && previousRoundsData !== null && 'rounds' in previousRoundsData && Array.isArray((previousRoundsData as any).rounds)
    ? (previousRoundsData as { rounds: Round[] }).rounds
    : [];
  const totalPreviousRounds = currentRoundNumber ? currentRoundNumber - 1 : 0;

  const treasuryFee = config?.treasuryFee;

  useEffect(() => {
    if (previousRounds.length > 0) {
      setAllPreviousRounds((prev) => {
        const roundMap = new Map<number, Round>();
        prev.forEach((round) => roundMap.set(Number(round.number), round));
        previousRounds.forEach((round: Round) => roundMap.set(Number(round.number), round));
        return Array.from(roundMap.values()).sort((a, b) => Number(b.number) - Number(a.number));
      });
    }
  }, [previousRounds]);

  const stableFetchUserBets = useCallback(() => {
    if (typeof fetchUserBets === 'function') {
      return fetchUserBets();
    }
    return Promise.resolve([]);
  }, [fetchUserBets]);

// hooks/roundManager.ts - Update the effect that checks for new rounds
useEffect(() => {
  if (!currentRoundNumber || !config || !program) return; 

  const checkNewRound = async () => {
      try {
          const newConfig = await queryClient.fetchQuery({
              queryKey: ["config"],
              queryFn: () => fetchConfig(program),
              staleTime: 10 * 1000, // Cache config for 10 seconds
          });
          
          const nextRoundNumber = currentRoundNumber + 1;
          if (newConfig.currentRound > currentRoundNumber) {
              console.log("New round detected:", newConfig.currentRound);
              
              // Only invalidate what's necessary
              await queryClient.invalidateQueries({ 
                  queryKey: ["config"], 
                  refetchType: "all" 
              });
              await queryClient.invalidateQueries({ 
                  queryKey: ["round", newConfig.currentRound], 
                  refetchType: "all" 
              });
              
              // Don't invalidate historical rounds - they don't change
              setIsLocked(false);
              setOffset(initialOffset); 
              await stableFetchUserBets();
          }
      } catch (error) {
          console.error("Failed to fetch config:", error);
      }
  };

  // Reduce check frequency
  const interval = setInterval(checkNewRound, 10000); // Check every 10 seconds instead of 5
  return () => clearInterval(interval);
}, [currentRoundNumber, config, program, queryClient, initialOffset, stableFetchUserBets]);
 

const fetchMoreRounds = async () => {
    if (!currentRoundNumber) return;
    const newOffset = offset + initialLimit;
    setOffset(newOffset);
    console.log(`Workspaceing more rounds with offset ${newOffset}`);
  };

  return {
    config,
    treasuryFee,
    currentRound,
    previousRounds: allPreviousRounds.length > 0 ? allPreviousRounds : previousRounds,
    totalPreviousRounds,
    isLoading: isConfigLoading || isCurrentRoundLoading || isPreviousRoundsLoading,
    isPaused: config?.isPaused || false,
    getRoundOutcome,
    fetchMoreRounds,
    timeLeft,
    isLocked,
    getRoundStatus,
    getTimerDisplay,
  };
};
import { useEffect, useState, useRef } from "react";
import { useConfig, useRound, getRoundOutcome, usePreviousRoundsByIds, fetchConfig } from "./useConfig";
import { useQueryClient } from "@tanstack/react-query";
import { Round } from "@/types/round";
import { useSolPredictor } from "./useBuyClaim";
import { useProgram } from "./useProgram"; // Import useProgram here to get the program instance

export const useRoundManager = (initialLimit: number = 5, initialOffset: number = 0) => {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(initialOffset);
  const [allPreviousRounds, setAllPreviousRounds] = useState<Round[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Store interval
  const { fetchUserBets } = useSolPredictor();

  const { program, error: programError } = useProgram(); // Get program instance from useProgram
  const { data: config, isLoading: isConfigLoading, error: configError } = useConfig();
  const currentRoundNumber = config?.currentRound ? Number(config.currentRound) : undefined;
  const { data: currentRound, isLoading: isCurrentRoundLoading, error: roundError } = useRound(currentRoundNumber);
  const { data: previousRoundsData, isLoading: isPreviousRoundsLoading } = usePreviousRoundsByIds(
    currentRoundNumber,
    initialLimit,
    offset
  );

  // Update the calculateTimeLeft function
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
      // Round has completely ended - wait for next round
      setTimeLeft(0);
      setIsLocked(true);
      return;
    }
    
    if (timeToLock <= 0 && timeToClose > 0) {
      // Round is in calculating phase - show remaining time until close
      const calculatingTimeLeft = Math.floor(timeToClose);
      setTimeLeft(calculatingTimeLeft);
      setIsLocked(true);
      return;
    }
    
    if (timeToLock > 0) {
      // Round is still accepting bets
      setTimeLeft(Math.floor(timeToLock));
      setIsLocked(false);
      return;
    }
  };

  // Update the getRoundStatus function to work with timeLeft
  const getRoundStatus = (roundData: any) => {
    if (!roundData) return "ENDED";
    
    const now = Date.now() / 1000;
    const lockTime = Number(roundData.lockTime);
    const closeTime = Number(roundData.closeTime);
    
    // If round has ended
    if (roundData.status === "ENDED" || roundData.status === "EXPIRED" || now >= closeTime) {
      return "ENDED";
    }
    
    // If lock time has passed but round hasn't closed (calculating phase)
    if (now >= lockTime && now < closeTime) {
      return "CALCULATING";
    }
    
    // If very close to lock time (5 seconds buffer)
    if (lockTime - now <= 5 && lockTime - now > 0) {
      return "LOCKING";
    }
    
    // Otherwise, it's live/active
    return "LIVE";
  };

  const getTimerDisplay = (roundData: any) => {
    const now = Date.now() / 1000;
    const lockTime = Number(roundData.lockTime);
    const closeTime = Number(roundData.closeTime);
    
    // If round has ended
    if (now >= closeTime || roundData.status === "ENDED") {
      return "Ended";
    }
    
    // If in calculating phase, show time until close
    if (now >= lockTime && now < closeTime) {
      const calculatingTime = Math.floor(closeTime - now);
      const minutes = Math.floor(calculatingTime / 60);
      const seconds = calculatingTime % 60;
      return `Calculating ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // If very close to lock time
    if (lockTime - now <= 5 && lockTime - now > 0) {
      const lockingTime = Math.floor(lockTime - now);
      return `Locking in ${lockingTime}s`;
    }
    
    // Show time until lock
    const timeToLock = Math.floor(lockTime - now);
    const minutes = Math.floor(timeToLock / 60);
    const seconds = timeToLock % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate time left for lock duration
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
      
      // Fix conversion of startTime to ensure it's always a number
      let startTimeMs: number;
      if (currentRound.startTime instanceof Date) {
        startTimeMs = currentRound.startTime.getTime();
      } else if (typeof currentRound.startTime === "string") {
        const numStartTime = Number(currentRound.startTime);
        startTimeMs = !isNaN(numStartTime) ? numStartTime * 1000 : Date.now();
      } else {
        startTimeMs = Number(currentRound.startTime) * 1000;
      }
      
      // Ensure lockTime and closeTime are always numbers
      let lockTimeValue = currentRound.lockTime !== undefined && currentRound.lockTime !== null
        ? Number(currentRound.lockTime)
        : startTimeMs / 1000 + config.lockDuration;
  
      const closeTimeValue = Number(currentRound.closeTime);
      
      const timeToLock = lockTimeValue - now;
      const timeToClose = closeTimeValue - now;
  
      if (timeToClose <= 0) {
        // Round has completely ended
        setTimeLeft(0);
        setIsLocked(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else if (timeToLock <= 0 && timeToClose > 0) {
        // Round is in calculating phase
        setTimeLeft(Math.floor(timeToClose));
        setIsLocked(true);
      } else if (timeToLock > 0) {
        // Round is still accepting bets
        setTimeLeft(Math.floor(timeToLock));
        setIsLocked(false);
      }
    };
  
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  
    // Calculate immediately
    calculateTimeLeft();
  
    // Start interval
    intervalRef.current = setInterval(calculateTimeLeft, 1000);
  
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentRound, config?.lockDuration, isCurrentRoundLoading, currentRoundNumber]);

  // Log errors for debugging
  useEffect(() => {
    if (programError) console.error("useProgram Error:", programError);
    if (configError) console.error("useConfig Error:", configError);
    if (roundError) console.error("useRound Error:", roundError);
  }, [programError, configError, roundError]);

  // Merge new previous rounds with existing ones
  const previousRounds = typeof previousRoundsData === 'object' && previousRoundsData !== null && 'rounds' in previousRoundsData && Array.isArray((previousRoundsData as any).rounds)
    ? (previousRoundsData as { rounds: Round[] }).rounds
    : [];
  const totalPreviousRounds = currentRoundNumber ? currentRoundNumber - 1 : 0; // Estimate total

  const treasuryFee = config?.treasuryFee;

  useEffect(() => {
    // Update allPreviousRounds when new previousRounds are fetched
    if (previousRounds.length > 0) {
      setAllPreviousRounds((prev) => {
        const roundMap = new Map<number, Round>();
        // Add existing rounds
        prev.forEach((round) => roundMap.set(Number(round.number), round));
        // Add new rounds, overwriting duplicates
        previousRounds.forEach((round: Round) => roundMap.set(Number(round.number), round));
        return Array.from(roundMap.values()).sort((a, b) => Number(b.number) - Number(a.number));
      });
    }
  }, [previousRounds]);

  // Detect new round and reset timer
  useEffect(() => {
    // Ensure config and program are loaded before proceeding
    if (!currentRoundNumber || !config || !program) return; 

    const checkNewRound = async () => {
      try {
        // Pass the actual program instance to fetchConfig
        const newConfig = await queryClient.fetchQuery({
          queryKey: ["config"],
          queryFn: () => fetchConfig(program), 
        });
        const nextRoundNumber = currentRoundNumber + 1;
        if (newConfig.currentRound > currentRoundNumber) {
          console.log("New round detected:", newConfig.currentRound);
          // Invalidate queries to fetch new round data
          await queryClient.invalidateQueries({ queryKey: ["config"], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ["round", currentRoundNumber], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ["round", newConfig.currentRound], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ["round", nextRoundNumber], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ['previousRounds', newConfig.currentRound], refetchType: 'all' }); // Use newConfig.currentRound for previousRounds
          
          setIsLocked(false); // Reset locked state, new timeLeft will be set by the other effect
          setOffset(initialOffset); 
          setAllPreviousRounds([]); 
          await fetchUserBets();
        } else if (isLocked) {
          // Try fetching next round after lock
          await queryClient.invalidateQueries({ queryKey: ["round", nextRoundNumber], refetchType: "all" });
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    };

    const interval = setInterval(checkNewRound, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [currentRoundNumber, isLocked, fetchUserBets, queryClient, config, initialOffset, program]); // Add program to dependencies

  const fetchMoreRounds = async () => {
    if (!currentRoundNumber) return;
    const newOffset = offset + initialLimit;
    setOffset(newOffset);
    // The usePreviousRoundsByIds hook will automatically fetch new rounds due to the updated queryKey
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
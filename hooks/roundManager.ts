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

  // Calculate time left for lock duration
  useEffect(() => {
    // Add a check here for config and currentRound being defined
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
        // Ensure string is a valid number before converting
        const numStartTime = Number(currentRound.startTime);
        startTimeMs = !isNaN(numStartTime) ? numStartTime * 1000 : Date.now(); // Fallback to Date.now() or handle error appropriately
      } else {
        // Assumed to be a number (Unix timestamp in seconds)
        startTimeMs = Number(currentRound.startTime) * 1000;
      }
      
      // Ensure lockTime is always a number
      let lockTimeValue = currentRound.lockTime !== undefined && currentRound.lockTime !== null
        ? Number(currentRound.lockTime)
        : startTimeMs / 1000 + config.lockDuration;
 
      // Override invalid lockTime
      if (lockTimeValue <= now && currentRound.number === currentRoundNumber) { // Ensure this applies to the current round being processed
        console.warn("Invalid lockTime for current round:", lockTimeValue, "Current Time:", now, "Using fallback.");
        lockTimeValue = now + config.lockDuration; // Set lockTime to now + lockDuration
        // When lockTime is reset, ensure isLocked is false so the timer can run
        setIsLocked(false); 
      }
      
      const timeRemaining = lockTimeValue - now;

      if (timeRemaining <= 0) {
        setTimeLeft(0);
        setIsLocked(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setTimeLeft(Math.floor(timeRemaining));
        setIsLocked(false); // Ensure isLocked is false if there's time remaining
      }
    };

    // Clear previous interval if it exists, before setting a new one or just calculating time.
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Calculate time immediately
    calculateTimeLeft();

    // Only start interval if not locked (calculateTimeLeft might have set isLocked to true)
    // and if the currentRound from the hook is indeed the active round number from config
    if (!isLocked && currentRound.number === currentRoundNumber) {
      intervalRef.current = setInterval(calculateTimeLeft, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentRound, config?.lockDuration, isCurrentRoundLoading, currentRoundNumber]); // Removed isLocked from deps, as it's managed within

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
  };
};
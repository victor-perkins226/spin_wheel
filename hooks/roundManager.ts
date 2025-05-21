import { useEffect, useState, useRef } from "react";
import { useConfig, useRound, getRoundOutcome, usePreviousRoundsByIds, fetchConfig } from "./useConfig";
import { useQueryClient } from "@tanstack/react-query";
import {  Round } from "@/types/round";
// import axios from "axios";
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previousRounds = previousRoundsData?.rounds || [];
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
      const startTimeMs = typeof currentRound.startTime === "string" && !isNaN(Number(currentRound.startTime))
        ? Number(currentRound.startTime) * 1000
        : new Date(currentRound.startTime).getTime();
      let lockTime = currentRound.lockTime || startTimeMs / 1000 + config.lockDuration;

      // Override invalid lockTime
      if (lockTime <= now) {
        console.warn("Invalid lockTime:", lockTime, "Current Time:", now, "Using fallback");
        lockTime = now + config.lockDuration; // Set lockTime to now + lockDuration
      }
      const timeRemaining = lockTime - now;

      if (timeRemaining <= 0) {
        setTimeLeft(0);
        setIsLocked(true);
        // Stop calculating until new round
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setTimeLeft(Math.floor(timeRemaining));
        setIsLocked(false);
      }
    };

    // Initialize timeLeft for new round
    // Only set initial timeLeft if config.lockDuration is available
    if (!isLocked && currentRound.number === currentRoundNumber && config.lockDuration !== undefined) {
      setTimeLeft(config.lockDuration);
    }

    // Only start interval if not locked
    if (!isLocked && !intervalRef.current) {
      calculateTimeLeft();
      intervalRef.current = setInterval(calculateTimeLeft, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentRound, config?.lockDuration, isCurrentRoundLoading, isLocked, currentRoundNumber]);

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
          await queryClient.invalidateQueries({ queryKey: ["round", currentRoundNumber], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ["round", newConfig.currentRound], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ["round", nextRoundNumber], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ['previousRounds', currentRoundNumber], refetchType: 'all' });
          setIsLocked(false);
          setTimeLeft(config?.lockDuration || 300); // Use config?.lockDuration for safety
          setOffset(initialOffset); // Reset offset for new round
          setAllPreviousRounds([]); // Clear previous rounds
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
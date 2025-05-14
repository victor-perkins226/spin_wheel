import { useEffect, useState, useRef } from "react";
import { useConfig, usePreviousRounds, useRound, fetchPreviousRounds, getRoundOutcome } from "./useConfig";
import { useQueryClient } from "@tanstack/react-query";
import { Config, Round } from "@/types/round";
import axios from "axios";




export const useRoundManager = (initialLimit: number = 5, initialOffset: number = 0) => {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(initialOffset);
  const [allPreviousRounds, setAllPreviousRounds] = useState<Round[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Store interval


  const { data: config, isLoading: isConfigLoading } = useConfig();
  const currentRoundNumber = config?.currentRound ? Number(config.currentRound) : undefined;
  const { data: currentRound, isLoading: isCurrentRoundLoading } = useRound(currentRoundNumber);
  const { data: previousRoundsData, isLoading: isPreviousRoundsLoading } = usePreviousRounds(
    currentRoundNumber,
    initialLimit,
    offset
  );

  // Merge new previous rounds with existing ones
  const previousRounds = previousRoundsData?.rounds || [];
  const totalPreviousRounds = previousRoundsData?.total || 0;

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
    if (!isLocked && currentRound.number === currentRoundNumber) {
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

  }, [currentRound, config?.lockDuration, isCurrentRoundLoading, isLocked,currentRoundNumber]);

  // Detect new round and reset timer
  useEffect(() => {
    if (!currentRoundNumber) return;

    const checkNewRound = async () => {
      try {
        const newConfig = await queryClient.fetchQuery({
          queryKey: ["config"],
          queryFn: fetchConfig,
        });
        if (newConfig.currentRound > currentRoundNumber) {
          console.log("New round detected:", newConfig.currentRound);
          await queryClient.invalidateQueries({ queryKey: ["round", currentRoundNumber], refetchType: "all" });
          await queryClient.invalidateQueries({ queryKey: ["round", newConfig.currentRound], refetchType: "all" });
          setIsLocked(false);
          setTimeLeft(config?.lockDuration || 300);
        }
      } catch (error) {
        console.error("Failed to fetch config:", error);
      }
    };

    const interval = setInterval(checkNewRound, 2000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [currentRoundNumber, isLocked, queryClient, config?.lockDuration]);

  const fetchConfig = async (): Promise<Config> => {
    const response = await axios.get("https://sol-prediction-backend.onrender.com/round/config");
    return response.data;
  };


  const fetchMoreRounds = async () => {
    if (!currentRoundNumber) return;
    const newOffset = offset + initialLimit;
    const newData = await queryClient.fetchQuery({
      queryKey: ["previousRounds", currentRoundNumber, initialLimit, newOffset],
      queryFn: () => fetchPreviousRounds(currentRoundNumber, initialLimit, newOffset),
    });
    setAllPreviousRounds((prev) => {
      const roundMap = new Map<number, Round>();
      // Add existing rounds
      prev.forEach((round) => roundMap.set(Number(round.number), round));
      // Add new rounds, overwriting duplicates
      newData.rounds.forEach((round) => roundMap.set(Number(round.number), round));
      return Array.from(roundMap.values()).sort((a, b) => Number(b.number) - Number(a.number));
    });
    setOffset(newOffset);
  };

  return {
    config,
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
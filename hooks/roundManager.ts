import { useEffect, useState } from "react";
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


  const { data: config, isLoading: isConfigLoading } = useConfig();
  const currentRoundNumber = config?.currentRound ? Number(config.currentRound) : undefined;
  const { data: currentRound, isLoading: isCurrentRoundLoading } = useRound(config?.currentRound);
  const { data: previousRoundsData, isLoading: isPreviousRoundsLoading } = usePreviousRounds(
    currentRoundNumber,
    initialLimit,
    offset
  );

  // Merge new previous rounds with existing ones
  const previousRounds = previousRoundsData?.rounds || [];
  const totalPreviousRounds = previousRoundsData?.total || 0;

  // Log currentRound for debugging
  useEffect(() => {
    console.log("Current Round:", currentRound ? Number(currentRound.number) : "undefined", "Time Left:", timeLeft, "Is Locked:", isLocked);
  }, [currentRound, timeLeft, isLocked]);


  // Calculate time left for lock duration
  useEffect(() => {
    if (!currentRound || !config?.lockDuration) {
      setTimeLeft(null);
      setIsLocked(false);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Date.now() / 1000; // Current time in seconds
      const startTimeMs = typeof currentRound.startTime === "string" && !isNaN(Number(currentRound.startTime))
        ? Number(currentRound.startTime) * 1000
        : new Date(currentRound.startTime).getTime();
      const lockTime = currentRound.lockTime || startTimeMs / 1000 + config.lockDuration;

      // Ensure lockTime is in the future
      if (lockTime <= now) {
        console.warn("Invalid lockTime:", lockTime, "Current Time:", now);
        setTimeLeft(null);
        setIsLocked(false);
        return;
      }
      const timeRemaining = lockTime - now;

      if (timeRemaining <= 0) {
        setTimeLeft(0);
        setIsLocked(true);
      } else {
        setTimeLeft(Math.floor(timeRemaining));
        setIsLocked(false);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [currentRound, config?.lockDuration,isCurrentRoundLoading]);

  // Detect new round and reset timer
  useEffect(() => {
    if (!currentRoundNumber || !isLocked) return;

    const checkNewRound = async () => {
      const newConfig = await queryClient.fetchQuery({
        queryKey: ["config"],
        queryFn: fetchConfig,
      });
      if (newConfig.currentRound > currentRoundNumber) {
        // New round detected, refetch current round
        await queryClient.invalidateQueries({ queryKey: ["round", currentRoundNumber] });
        setIsLocked(false);
        setTimeLeft(null); // Will be recalculated in the above useEffect
      }
    };

    const interval = setInterval(checkNewRound, 2000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [currentRoundNumber, isLocked, queryClient]);

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
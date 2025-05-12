import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useRound, usePreviousRounds } from "./useConfig";

export const useRoundManager = () => {
  const queryClient = useQueryClient();
  const { data: config, isLoading: isConfigLoading } = useConfig();
  const currentRoundNumber = config?.currentRound;
  const roundDuration = config?.roundDuration;

  // Fetch current round
  const { data: currentRound, isLoading: isCurrentRoundLoading } = useRound(currentRoundNumber);

  // Fetch previous rounds
  const { data: previousRoundsData, isLoading: isPreviousRoundsLoading } = usePreviousRounds(
    currentRoundNumber,
    
  );
  const previousRounds = previousRoundsData?.rounds || [];
  const totalPreviousRounds = previousRoundsData?.total || 0;

  // Poll for new round after lockTime
  useEffect(() => {
    if (!currentRound || !roundDuration) return;

    const now = Date.now() / 1000; // Current time in seconds
    const lockTime = currentRound.lockTime;
    const timeUntilLock = (lockTime - now) * 1000; // Convert to milliseconds

    if (timeUntilLock > 0) {
      const timer = setTimeout(() => {
        // Refetch config to get the new currentRound
        queryClient.invalidateQueries(["config"]);
        // Refetch previous rounds to include the old current round
        queryClient.invalidateQueries(["previousRounds"]);
      }, timeUntilLock + 1000); // Add 1 second buffer

      return () => clearTimeout(timer);
    }
  }, [currentRound, roundDuration, queryClient]);

  // Calculate round outcome
  const getRoundOutcome = (round: Round): string => {
    if (!round.endPrice || !round.lockPrice) return "Pending";
    return round.endPrice > round.lockPrice ? "Bull" : round.endPrice < round.lockPrice ? "Bear" : "Tie";
  };

  return {
    config,
    currentRound,
    previousRounds,
    totalPreviousRounds,
    isLoading: isConfigLoading || isCurrentRoundLoading || isPreviousRoundsLoading,
    isPaused: config?.isPaused,
    getRoundOutcome,
  };
};
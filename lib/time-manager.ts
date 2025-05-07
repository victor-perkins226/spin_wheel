// time-manager.ts
const ROUND_START_KEY = "roundStartTime";
const ROUND_DURATION_KEY = "roundDuration";
const CURRENT_ROUND_KEY = "currentRound";

/**
 * Sets the round start time and duration in seconds
 * @param durationSeconds Total round duration in seconds
 * @param currentRound Current round number
 */
export const setRoundStart = async (
  durationSeconds: number,
  currentRound: number
): Promise<void> => {
  const now = Date.now();
  localStorage.setItem(ROUND_START_KEY, now.toString());
  localStorage.setItem(ROUND_DURATION_KEY, durationSeconds.toString());
  localStorage.setItem(CURRENT_ROUND_KEY, currentRound.toString());
};

/**
 * Returns remaining time in seconds and information about the round
 */
export const getRemainingTime = async (): Promise<{
  remainingSeconds: number;
  roundNumber: number;
  roundDuration: number;
  elapsedPercentage: number;
}> => {
  const startStr = localStorage.getItem(ROUND_START_KEY);
  const durationStr = localStorage.getItem(ROUND_DURATION_KEY);
  const roundStr = localStorage.getItem(CURRENT_ROUND_KEY);

  if (!startStr || !durationStr || !roundStr) {
    return {
      remainingSeconds: 0,
      roundNumber: 0,
      roundDuration: 0,
      elapsedPercentage: 0,
    };
  }

  const start = parseInt(startStr, 10);
  const duration = parseInt(durationStr, 10);
  const roundNumber = parseInt(roundStr, 10);

  const now = Date.now();
  const elapsedMs = now - start;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  // Calculate how many full rounds have passed since the start
  const passedRounds = Math.floor(elapsedSeconds / duration);
  
  // Calculate the current position within the current round
  const secondsInCurrentRound = elapsedSeconds % duration;
  const remainingSeconds = duration - secondsInCurrentRound;
  
  // Calculate the actual current round number
  const actualRoundNumber = roundNumber + passedRounds;
  
  // Calculate elapsed percentage for progress bars
  const elapsedPercentage = (secondsInCurrentRound / duration) * 100;

  return {
    remainingSeconds: Math.max(0, remainingSeconds),
    roundNumber: actualRoundNumber,
    roundDuration: duration,
    elapsedPercentage: elapsedPercentage,
  };
};

/**
 * Checks if the round configuration has changed
 * @param newRoundDuration The new round duration in seconds
 * @param newRoundNumber The new round number
 * @returns true if configuration has changed
 */
export const hasRoundConfigChanged = async (
  newRoundDuration: number,
  newRoundNumber: number
): Promise<boolean> => {
  const durationStr = localStorage.getItem(ROUND_DURATION_KEY);
  const roundStr = localStorage.getItem(CURRENT_ROUND_KEY);
  
  if (!durationStr || !roundStr) return true;
  
  const currentDuration = parseInt(durationStr, 10);
  const roundFromTime = await getRemainingTime();
  
  return (
    currentDuration !== newRoundDuration || 
    roundFromTime.roundNumber !== newRoundNumber
  );
};
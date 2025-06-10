import { API_URL } from "./config";

const ROUND_START_KEY = "roundStartTime";
const ROUND_DURATION_KEY = "roundDuration";
const LOCK_DURATION_KEY = "lockDuration";
const CURRENT_ROUND_KEY = "currentRound";
const SERVER_TIME_OFFSET_KEY = "serverTimeOffset";
const CONFIG_CACHE_KEY = "configCache";
const CONFIG_CACHE_TIMESTAMP = "configCacheTimestamp";
const ROUND_CACHE_PREFIX = "roundCache_";
const ROUND_CACHE_TIMESTAMP_PREFIX = "roundCacheTimestamp_";

// Cache expiration times (in milliseconds)
const CONFIG_CACHE_TTL = 30000; // 30 seconds
const ROUND_CACHE_TTL = 10000; // 10 seconds

/**
 * Synchronizes the local time with server time
 * @returns Promise that resolves when sync is complete
 */
export const syncWithServerTime = async (): Promise<void> => {
  try {
    // Get server time from the API
    const startTime = Date.now();
    const response = await fetch(
      `${API_URL}/round/config`
    );
    const endTime = Date.now();
    const roundTripTime = endTime - startTime;

    // Approximate server time by adding half the round trip time
    const serverTime =
      new Date(response.headers.get("date")).getTime() + roundTripTime / 2;
    const localTime = Date.now();
    const offset = serverTime - localTime;

    // Store the offset
    localStorage.setItem(SERVER_TIME_OFFSET_KEY, offset.toString());
  } catch (error) {
    console.error("Failed to sync with server time:", error);
  }
};

/**
 * Gets the current time adjusted with server offset
 * @returns Current time adjusted with server offset
 */
export const getAdjustedTime = (): number => {
  const offsetStr = localStorage.getItem(SERVER_TIME_OFFSET_KEY);
  const offset = offsetStr ? Number.parseInt(offsetStr, 10) : 0;
  return Date.now() + offset;
};

/**
 * Sets the round start time and duration in seconds
 * @param durationSeconds Total round duration in seconds
 * @param lockDurationSeconds Lock duration in seconds
 * @param currentRound Current round number
 */
export const setRoundStart = async (
  durationSeconds: number,
  lockDurationSeconds: number,
  currentRound: number
): Promise<void> => {
  const now = getAdjustedTime();
  localStorage.setItem(ROUND_START_KEY, now.toString());
  localStorage.setItem(ROUND_DURATION_KEY, durationSeconds.toString());
  localStorage.setItem(LOCK_DURATION_KEY, lockDurationSeconds.toString());
  localStorage.setItem(CURRENT_ROUND_KEY, currentRound.toString());
};

/**
 * Returns remaining time in seconds and information about the round
 */
export const getRemainingTime = (): {
  remainingSeconds: number;
  lockTimeSeconds: number;
  roundNumber: number;
  roundDuration: number;
  lockDuration: number;
  elapsedPercentage: number;
  isLockPhase: boolean;
} => {
  const startStr = localStorage.getItem(ROUND_START_KEY);
  const durationStr = localStorage.getItem(ROUND_DURATION_KEY);
  const lockDurationStr = localStorage.getItem(LOCK_DURATION_KEY);
  const roundStr = localStorage.getItem(CURRENT_ROUND_KEY);

  if (!startStr || !durationStr || !roundStr || !lockDurationStr) {
    return {
      remainingSeconds: 0,
      lockTimeSeconds: 0,
      roundNumber: 0,
      roundDuration: 0,
      lockDuration: 0,
      elapsedPercentage: 0,
      isLockPhase: false,
    };
  }

  const start = Number.parseInt(startStr, 10);
  const duration = Number.parseInt(durationStr, 10);
  const lockDuration = Number.parseInt(lockDurationStr, 10);
  const roundNumber = Number.parseInt(roundStr, 10);

  // Use adjusted time for accurate calculations
  const now = getAdjustedTime();
  const elapsedMs = now - start;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Calculate how many full rounds have passed since the start
  const passedRounds = Math.floor(elapsedSeconds / duration);

  // Calculate the current position within the current round
  const secondsInCurrentRound = elapsedSeconds % duration;
  const remainingSeconds = duration - secondsInCurrentRound;

  // Calculate when the lock phase starts
  const lockTimeSeconds = Math.max(0, remainingSeconds - lockDuration);
  const isLockPhase = lockTimeSeconds === 0 && remainingSeconds > 0;

  // Calculate the actual current round number
  const actualRoundNumber = roundNumber + passedRounds;

  // Calculate elapsed percentage for progress bars
  const elapsedPercentage = (secondsInCurrentRound / duration) * 100;

  return {
    remainingSeconds: Math.max(0, remainingSeconds - 120),
    lockTimeSeconds,
    roundNumber: actualRoundNumber,
    roundDuration: duration,
    lockDuration,
    elapsedPercentage,
    isLockPhase,
  };
};

/**
 * Checks if the round configuration has changed
 * @param newRoundDuration The new round duration in seconds
 * @param newLockDuration The new lock duration in seconds
 * @param newRoundNumber The new round number
 * @returns true if configuration has changed
 */
export const hasRoundConfigChanged = (
  newRoundDuration: number,
  newLockDuration: number,
  newRoundNumber: number
): boolean => {
  const durationStr = localStorage.getItem(ROUND_DURATION_KEY);
  const lockDurationStr = localStorage.getItem(LOCK_DURATION_KEY);
  const roundStr = localStorage.getItem(CURRENT_ROUND_KEY);

  if (!durationStr || !lockDurationStr || !roundStr) return true;

  const currentDuration = Number.parseInt(durationStr, 10);
  const currentLockDuration = Number.parseInt(lockDurationStr, 10);
  const roundFromTime = getRemainingTime();

  return (
    currentDuration !== newRoundDuration ||
    currentLockDuration !== newLockDuration ||
    roundFromTime.roundNumber !== newRoundNumber
  );
};

/**
 * Fetches round details from the API with caching
 * @param roundId Round ID to fetch
 * @returns Round details or null if not found
 */
export const fetchRoundDetails = async (roundId: number): Promise<any> => {
  // Check cache first
  const cacheKey = `${ROUND_CACHE_PREFIX}${roundId}`;
  const timestampKey = `${ROUND_CACHE_TIMESTAMP_PREFIX}${roundId}`;
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTimestamp = localStorage.getItem(timestampKey);

  // If we have valid cached data, use it
  if (cachedData && cachedTimestamp) {
    const timestamp = Number.parseInt(cachedTimestamp, 10);
    const now = Date.now();
    if (now - timestamp < ROUND_CACHE_TTL) {
      return JSON.parse(cachedData);
    }
  }

  // Otherwise fetch from API
  try {
    const response = await fetch(
      `${API_URL}/round/${roundId}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch round ${roundId}`);
    }
    const data = await response.json();

    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(timestampKey, Date.now().toString());

    return data;
  } catch (error) {
    console.error(`Error fetching round ${roundId}:`, error);
    // If fetch fails but we have cached data (even if expired), return it as fallback
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  }
};

/**
 * Fetches the current configuration from the API with caching
 * @returns Configuration object or null if failed
 */
export const fetchConfig = async (): Promise<any> => {
  // Check cache first
  const cachedConfig = localStorage.getItem(CONFIG_CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(CONFIG_CACHE_TIMESTAMP);

  // If we have valid cached data, use it
  if (cachedConfig && cachedTimestamp) {
    const timestamp = Number.parseInt(cachedTimestamp, 10);
    const now = Date.now();
    if (now - timestamp < CONFIG_CACHE_TTL) {
      return JSON.parse(cachedConfig);
    }
  }

  // Otherwise fetch from API
  try {
    const response = await fetch(
      `${API_URL}/round/config`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch configuration");
    }
    const data = await response.json();

    // Cache the result
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CONFIG_CACHE_TIMESTAMP, Date.now().toString());

    return data;
  } catch (error) {
    console.error("Error fetching configuration:", error);
    // If fetch fails but we have cached data (even if expired), return it as fallback
    if (cachedConfig) {
      return JSON.parse(cachedConfig);
    }
    return null;
  }
};

/**
 * Calculates round times based on configuration
 * @param config The round configuration
 * @returns Object with start, lock, and end times
 */
export const calculateRoundTimes = (
  config: any,
  roundNumber: number
): { startTime: number; lockTime: number; endTime: number } => {
  if (!config) return { startTime: 0, lockTime: 0, endTime: 0 };

  const roundDuration = Number.parseInt(config.roundDuration);
  const lockDuration = Number.parseInt(config.lockDuration || "30");

  // Get current round info
  const { remainingSeconds, roundNumber: currentRound } = getRemainingTime();

  const now = getAdjustedTime();

  // Calculate times based on round number relative to current round
  const roundDiff = roundNumber - currentRound;

  if (roundDiff < 0) {
    // Past round
    const endTime = now - (Math.abs(roundDiff) - 1) * roundDuration * 1000;
    const startTime = endTime - roundDuration * 1000;
    const lockTime = endTime - lockDuration * 1000;
    return { startTime, lockTime, endTime };
  } else if (roundDiff === 0) {
    // Current round
    const endTime = now + remainingSeconds * 1000;
    const startTime = endTime - roundDuration * 1000;
    const lockTime = endTime - lockDuration * 1000;
    return { startTime, lockTime, endTime };
  } else {
    // Future round
    const startTime =
      now + remainingSeconds * 1000 + (roundDiff - 1) * roundDuration * 1000;
    const endTime = startTime + roundDuration * 1000;
    const lockTime = endTime - lockDuration * 1000;
    return { startTime, lockTime, endTime };
  }
};

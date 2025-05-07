// useCountdownTimer.ts
import { useEffect, useState } from "react";
import { getRemainingTime } from "../lib/time-manager";

interface CountdownTimerState {
  remainingSeconds: number;
  formattedTime: string;
  elapsedPercentage: number;
  currentRound: number;
  isRoundEnding: boolean;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const useCountdownTimer = () => {
  const [timerState, setTimerState] = useState<CountdownTimerState>({
    remainingSeconds: 0,
    formattedTime: "0:00",
    elapsedPercentage: 0,
    currentRound: 0,
    isRoundEnding: false,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateTimer = async () => {
      const { remainingSeconds, roundNumber, elapsedPercentage } = await getRemainingTime();
      
      // Round is considered ending when less than 10 seconds remain
      const isRoundEnding = remainingSeconds < 10;

      setTimerState({
        remainingSeconds,
        formattedTime: formatTime(remainingSeconds),
        elapsedPercentage,
        currentRound: roundNumber,
        isRoundEnding,
      });
    };

    // Run immediately and then at each interval
    updateTimer();
    
    interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return timerState;
};
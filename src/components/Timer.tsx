import React, { useState, useEffect, useCallback, memo } from 'react';

interface TimeLeft {
  minutes: number;
  seconds: number;
}

interface TimerProps {
  targetTime: string | number;
  onTimeUp?: () => void;
}

const Timer = memo(({ targetTime, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());
  const [isLocked, setIsLocked] = useState<boolean>(false);

  function calculateTimeLeft(): TimeLeft {
    const difference = +new Date(targetTime) - +new Date();
    let timeLeft: TimeLeft = {
      minutes: 0,
      seconds: 0
    };

    if (difference > 0) {
      timeLeft = {
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  }

  useEffect(() => {
    if (isLocked) return;
    
    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Check if the timer has reached zero
      if (newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setIsLocked(true);
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [targetTime, timeLeft, isLocked, onTimeUp]);

  // Reset when targetTime changes
  useEffect(() => {
    setTimeLeft(calculateTimeLeft());
    setIsLocked(false);
  }, [targetTime]);

  return (
    <div className={`timer ${isLocked ? 'locked' : ''}`}>
      <span className="minutes">{timeLeft.minutes.toString().padStart(2, '0')}</span>:
      <span className="seconds">{timeLeft.seconds.toString().padStart(2, '0')}</span>
    </div>
  );
});

export default Timer;

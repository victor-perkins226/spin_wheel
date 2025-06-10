import React, { useEffect, useState, useCallback, memo } from 'react';
import { useDeepMemo } from '../hooks/useDeepMemo';
import Timer from './Timer';

interface RoundData {
  id: number;
  startTime: string | number;
  endTime: string | number;
  // Add other properties as needed
}

interface RoundProps {
  roundData: RoundData;
  isLive: boolean;
  onRoundEnd?: (roundId: number) => void;
}

const Round = memo(({ roundData, isLive, onRoundEnd }: RoundProps) => {
  const [localRoundData, setLocalRoundData] = useState<RoundData>(roundData);
  
  // Handle round ending safely
  const handleRoundEnd = useCallback(() => {
    if (onRoundEnd) {
      try {
        onRoundEnd(roundData.id);
      } catch (error) {
        console.error('Error handling round end:', error);
      }
    }
  }, [roundData.id, onRoundEnd]);

  // Update local state when props change
  useEffect(() => {
    setLocalRoundData(roundData);
  }, [roundData]);

  // Safety check for data
  if (!localRoundData) {
    return <div className="round loading">Loading round data...</div>;
  }

  return (
    <div className={`round ${isLive ? 'live' : ''}`}>
      <div className="round-header">
        <h3>Round #{localRoundData.id}</h3>
        {isLive && (
          <Timer 
            targetTime={localRoundData.endTime} 
            onTimeUp={handleRoundEnd} 
          />
        )}
      </div>
      {/* ...existing code... */}
    </div>
  );
});

export default Round;
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDeepMemo } from '../hooks/useDeepMemo';
import Round from '../components/Round';

interface RoundData {
  id: number;
  startTime: string | number;
  endTime: string | number;
  // Add other properties as needed
}

interface ApiResponse {
  data: RoundData[];
}

// Assuming this is how your api is structured
const api = {
  getRounds: async (): Promise<ApiResponse> => {
    // Implementation would be here
    return { data: [] }; // Placeholder
  }
};

const PredictionContainer: React.FC = () => {
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [liveRoundId, setLiveRoundId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch rounds data with error handling
  const fetchRounds = useCallback(async () => {
    try {
      setIsLoading(true);
      // Your API call to get rounds data
      const response = await api.getRounds();
      if (response && Array.isArray(response.data)) {
        setRounds(response.data);
        
        // Determine which round is live
        const currentTime = Date.now();
        const liveRound = response.data.find(round => 
          new Date(round.startTime).getTime() <= currentTime && 
          new Date(round.endTime).getTime() > currentTime
        );
        
        if (liveRound) {
          setLiveRoundId(liveRound.id);
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching rounds:', err);
      setError('Failed to load prediction rounds. Please try again later.');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRounds();
    
    // Set up interval for periodic updates
    const intervalId = setInterval(fetchRounds, 30000); // Update every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [fetchRounds]);

  // Handle round ending safely
  const handleRoundEnd = useCallback((roundId: number) => {
    console.log(`Round ${roundId} has ended`);
    
    // Move to the next round
    setRounds(prevRounds => {
      const index = prevRounds.findIndex(r => r.id === roundId);
      if (index !== -1 && index < prevRounds.length - 1) {
        setLiveRoundId(prevRounds[index + 1].id);
      }
      return prevRounds;
    });
    
    // Fetch fresh data
    fetchRounds();
  }, [fetchRounds]);

  // Memoize rounds to prevent unnecessary re-renders
  const memoizedRounds = useDeepMemo(rounds);

  if (isLoading) {
    return <div className="loading-container">Loading prediction data...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="prediction-container">
      <h1>Solana Price Prediction</h1>
      <div className="rounds-container">
        {memoizedRounds.map(round => (
          <Round
            key={round.id}
            roundData={round}
            isLive={round.id === liveRoundId}
            onRoundEnd={handleRoundEnd}
          />
        ))}
      </div>
      {/* ...existing code... */}
    </div>
  );
};

export default PredictionContainer;
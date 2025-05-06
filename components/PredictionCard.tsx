// src/components/PredictionCard.tsx
import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import idl from '../lib/idl.json';

const PROGRAM_ID = new PublicKey('7uYDitac59MxCgP7Narmfb8HfPWLjk7sQGTGosiV7RPL');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sol-prediction-backend.onrender.com/round';

// Round status variants
const ROUND_STATUS = {
  EXPIRED: 'expired',
  LIVE: 'live',
  NEXT: 'next',
  LATER: 'later',
};

interface Config {
  roundDuration: string;
  lockDuration: string;
  currentRound: string;
  genesisStarted: boolean;
  genesisLocked: boolean;
  minBetAmount: string;
  isPaused: boolean;
  admin: string;
}

interface Round {
  number: string;
  startTime: string;
  lockTime: string;
  closeTime: string;
  totalAmount: string;
  totalBullAmount: string;
  totalBearAmount: string;
  isActive: boolean;
  variant?: string; // Add variant for status display
  status?: string; // Add status for UI
  canBet?: boolean; // Flag if user can bet on this round
}

const RoundCard: React.FC<{
  round: Round | null;
  config: Config | null;
  onPlaceBet: (roundId: number, isBull: boolean, amount: number) => Promise<void>;
  betAmount: number;
  setBetAmount: (amount: number) => void;
}> = ({ round, config, onPlaceBet, betAmount, setBetAmount }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!config || !round) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      let nextEventTime: number;

      const roundNumber = parseInt(round.number);
      const startTime = parseInt(round.startTime);
      const lockTime = parseInt(round.lockTime);
      const closeTime = parseInt(round.closeTime);

      // Determine next event time based on round variant
      if (round.variant === ROUND_STATUS.NEXT || round.variant === ROUND_STATUS.LATER) {
        // For next/later rounds, show time until start
        nextEventTime = startTime;
      } else if (round.variant === ROUND_STATUS.LIVE) {
        // Live round: time until lock
        nextEventTime = lockTime;
      } else {
        // Expired round: show 0
        nextEventTime = now;
      }

      const secondsLeft = Math.max(0, nextEventTime - now);
      const minutes = Math.floor(secondsLeft / 60);
      const seconds = secondsLeft % 60;
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [config, round]);

  if (!round) return null;

  // Determine button label based on round variant
  const getButtonLabel = (direction: string) => {
    if (round.variant === ROUND_STATUS.EXPIRED) return `${direction} (CLOSED)`;
    if (round.variant === ROUND_STATUS.NEXT) return `Bet ${direction}`;
    if (round.variant === ROUND_STATUS.LATER) return `${direction} (NOT OPEN)`;
    return `Bet ${direction}`;
  };

  // Get status label
  const getStatusLabel = () => {
    switch (round.variant) {
      case ROUND_STATUS.EXPIRED: return 'ENDED';
      case ROUND_STATUS.LIVE: return 'LIVE';
      case ROUND_STATUS.NEXT: return 'UPCOMING';
      case ROUND_STATUS.LATER: return 'LATER';
      default: return round.isActive ? 'ACTIVE' : 'LOCKED';
    }
  };

  // Format SOL amount
  const formatSol = (lamports: string) => {
    return (parseInt(lamports) / anchor.web3.LAMPORTS_PER_SOL).toFixed(2);
  };

  return (
    <div className={`p-4 bg-gray-700 rounded-lg ${round.variant !== ROUND_STATUS.EXPIRED ? 'ml-4' : ''}`}>
      <h3 className="text-lg font-bold">Round #{round.number}</h3>
      <p>Status: {getStatusLabel()}</p>
      <p>{round.variant === ROUND_STATUS.LIVE ? 'Time Until Lock' : 
          round.variant === ROUND_STATUS.EXPIRED ? 'Ended' : 
          'Time Until Start'}: {timeLeft || 'N/A'}</p>
      <p>Prize Pool: {formatSol(round.totalAmount)} SOL</p>
      
      <div className="flex mt-2">
        <div className="flex-1 text-center">
          <p className="text-green-400">UP</p>
          <p>{formatSol(round.totalBullAmount)} SOL</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-red-400">DOWN</p>
          <p>{formatSol(round.totalBearAmount)} SOL</p>
        </div>
      </div>
      
      {round.canBet && (
        <div className="mt-4">
          <label className="block mb-1">Bet Amount (SOL)</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
            className="w-full p-2 bg-gray-600 rounded-lg text-white mb-2"
            placeholder="Enter amount"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onPlaceBet(parseInt(round.number), true, betAmount)}
              disabled={!round.canBet}
              className={`flex-1 py-2 rounded-lg ${round.canBet ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 cursor-not-allowed'}`}
            >
              {getButtonLabel('UP')}
            </button>
            <button
              onClick={() => onPlaceBet(parseInt(round.number), false, betAmount)}
              disabled={!round.canBet}
              className={`flex-1 py-2 rounded-lg ${round.canBet ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 cursor-not-allowed'}`}
            >
              {getButtonLabel('DOWN')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const PredictionCard: React.FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const { connected, publicKey, signTransaction, sendTransaction } = useWallet();

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(
    connection,
    { publicKey, signTransaction } as any,
    { commitment: 'confirmed' }
  );
  const program = new anchor.Program(idl as any, PROGRAM_ID, provider);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
  const getRoundPda = (roundNumber: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from('round'), new anchor.BN(roundNumber).toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    )[0];

    
  const getEscrowPda = (roundNumber: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), new anchor.BN(roundNumber).toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    )[0];
  const getUserBetPda = (user: PublicKey, roundNumber: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from('user_bet'),
        user.toBuffer(),
        new anchor.BN(roundNumber).toArrayLike(Buffer, 'le', 8),
      ],
      PROGRAM_ID
    )[0];

  // Fetch config and round data
  const fetchData = async (retries = 3) => {
    setLoading(true);
    setError('');
    for (let i = 0; i < retries; i++) {
      try {
        // Fetch config
        const configResponse = await fetch(`${API_URL}/config`);
        if (!configResponse.ok) throw new Error('Failed to fetch config');
        const configData: Config = await configResponse.json();
        console.log('Fetched config:', configData);
        setConfig(configData);

        // Fetch round data - get current round from config
        const currentRoundId = parseInt(configData.currentRound) || 0;
        if (currentRoundId > 0) {
          const fetchedRounds: Round[] = [];
          
          // Try to fetch expired round (currentRound - 1)
          if (currentRoundId > 1) {
            try {
              const expiredRoundResponse = await fetch(`${API_URL}/${currentRoundId - 1}`);
              if (expiredRoundResponse.ok) {
                const expiredRoundData: Round = await expiredRoundResponse.json();
                expiredRoundData.variant = ROUND_STATUS.EXPIRED;
                expiredRoundData.status = 'ENDED';
                expiredRoundData.canBet = false;
                fetchedRounds.push(expiredRoundData);
              }
            } catch (err) {
              console.log('No expired round available');
            }
          }
          
          // Fetch current round (LIVE)
          const currentRoundResponse = await fetch(`${API_URL}/${currentRoundId}`);
          if (currentRoundResponse.ok) {
            const currentRoundData: Round = await currentRoundResponse.json();
            currentRoundData.variant = ROUND_STATUS.LIVE;
            currentRoundData.status = 'LIVE';
            currentRoundData.canBet = false; // Can't bet on live round
            fetchedRounds.push(currentRoundData);
          }
          
          // Fetch next round (NEXT - can bet on this one)
          const nextRoundResponse = await fetch(`${API_URL}/${currentRoundId + 1}`);
          if (nextRoundResponse.ok) {
            const nextRoundData: Round = await nextRoundResponse.json();
            nextRoundData.variant = ROUND_STATUS.NEXT;
            nextRoundData.status = 'UPCOMING';
            
            // Determine if user can bet on this round
            const now = Math.floor(Date.now() / 1000);
            const isActive = nextRoundData.isActive;
            const isNotPaused = !configData.isPaused;
            const minBetAmount = parseInt(configData.minBetAmount) / anchor.web3.LAMPORTS_PER_SOL;
            nextRoundData.canBet = isActive && isNotPaused && betAmount >= minBetAmount;
            
            fetchedRounds.push(nextRoundData);
          }
          
          // Fetch later round
          const laterRoundResponse = await fetch(`${API_URL}/${currentRoundId + 2}`);
          if (laterRoundResponse.ok) {
            const laterRoundData: Round = await laterRoundResponse.json();
            laterRoundData.variant = ROUND_STATUS.LATER;
            laterRoundData.status = 'LATER';
            laterRoundData.canBet = false; // Can't bet on later round yet
            fetchedRounds.push(laterRoundData);
          }
          
          console.log('Fetched rounds:', fetchedRounds);
          setRounds(fetchedRounds);
        } else {
          setRounds([]);
        }
        setError('');
        break;
      } catch (err: any) {
        console.error(`Attempt ${i + 1} failed:`, err);
        if (i === retries - 1) {
          setError('Failed to fetch round data after retries.');
          setRounds([]);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
    setLoading(false);
  };

  // Poll every 5 seconds
  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      if (!isMounted) return;
      await fetchData();
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update betting eligibility when bet amount changes
  useEffect(() => {
    if (!config) return;
    
    const minBetAmount = parseInt(config.minBetAmount) / anchor.web3.LAMPORTS_PER_SOL;
    
    setRounds(prevRounds => 
      prevRounds.map(round => {
        if (round.variant === ROUND_STATUS.NEXT) {
          const isActive = round.isActive;
          const isNotPaused = !config.isPaused;
          return {
            ...round,
            canBet: isActive && isNotPaused && betAmount >= minBetAmount
          };
        }
        return round;
      })
    );
  }, [betAmount, config]);

  // Place bet
  const handlePlaceBet = async (roundId: number, isBull: boolean, amount: number) => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }
    
    const round = rounds.find(r => parseInt(r.number) === roundId);
    if (!round || !round.canBet) {
      setError('Betting is not available for this round');
      return;
    }
    
    if (amount <= 0) {
      setError('Please enter a valid bet amount');
      return;
    }

    try {
      const roundPda = getRoundPda(roundId);
      const escrowPda = getEscrowPda(roundId);
      const userBetPda = getUserBetPda(publicKey, roundId);

      const tx = await program.methods
        .placeBet(new anchor.BN(amount * anchor.web3.LAMPORTS_PER_SOL), isBull, new anchor.BN(roundId))
        .accounts({
          config: configPda,
          round: roundPda,
          userBet: userBetPda,
          user: publicKey,
          escrow: escrowPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .transaction();

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setError('');
      alert(`Bet placed successfully! Signature: ${signature}`);
      setBetAmount(0.1);
      await fetchData(); // Refresh data after betting
    } catch (err: any) {
      console.error('Error placing bet:', err);
      if (err.message.includes('6012')) {
        setError('Contract is paused');
      } else if (err.message.includes('6013')) {
        setError(`Bet amount must be at least ${parseInt(config!.minBetAmount) / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      } else if (err.message.includes('6014')) {
        setError('You have already bet in this round');
      } else if (err.message.includes('6022')) {
        setError('Round is locked for betting');
      } else {
        setError('Failed to place bet');
      }
    }
  };

  // Start genesis round
  const handleStartGenesis = async () => {
    if (!connected || !publicKey) {
      setError('Please connect your wallet');
      return;
    }
    if (config && config.admin !== publicKey.toString()) {
      setError('Only the admin can start the genesis round');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/round/start-genesis`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start genesis round');
      const data = await response.json();
      setError('');
      alert(`Genesis round started! Transaction: ${data.transaction}`);
      await fetchData(); // Refresh data immediately
    } catch (err) {
      console.error('Error starting genesis round:', err);
      setError('Failed to start genesis round');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-800 text-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Prediction Game</h2>
        <WalletMultiButton />
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {!config?.genesisStarted && (
        <button
          onClick={handleStartGenesis}
          className="w-full bg-yellow-500 text-black py-2 rounded-lg mb-4 hover:bg-yellow-600"
          disabled={!connected || (config && config.admin !== publicKey?.toString())}
        >
          Start Genesis Round
        </button>
      )}

      {config?.genesisStarted && rounds.length === 0 && !loading && (
        <p>No active rounds available.</p>
      )}

      {loading && <p>Loading round data...</p>}

      {config?.genesisStarted && rounds.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {rounds.map((round) => (
            <RoundCard
              key={round.number}
              round={round}
              config={config}
              onPlaceBet={handlePlaceBet}
              betAmount={betAmount}
              setBetAmount={setBetAmount}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionCard;
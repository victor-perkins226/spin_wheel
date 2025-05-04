"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { getPriceData } from "@/lib/price-utils";
import { checkRoundStatus, placeBet, claimPayout } from "@/lib/contract-utils";
import { PublicKey } from "@solana/web3.js";

// Round duration constants in seconds
const ROUND_DURATION = {
  LIVE: 300, // 5 minutes (300 seconds)
  LOCK: 150, // 2.5 minutes (150 seconds)
  TOTAL: 450, // 5 minutes (450 seconds)
  ENTRY_WAIT: 600, // 10 minutes (600 seconds) before entry starts
};

// Helper to truncate wallet addresses
const truncateAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Format seconds into mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Generate initial rounds state with 5 rounds
const generateInitialRounds = (currentPrice) => {
  const now = Date.now();

  return [
    // Two expired rounds
    {
      id: 1,
      variant: "expired",
      status: "ENDED",
      prizePool: 8.6015,
      timeRemaining: 0,
      lockPrice: currentPrice - 2.0,
      closePrice: currentPrice - 1.5,
      startTime: now - ROUND_DURATION.TOTAL * 4000,
      endTime: now - ROUND_DURATION.TOTAL * 3000,
      upBets: 4.3,
      downBets: 4.3015,
      totalBets: 12,
      liveBets: [],
    },

    // Current live round
    {
      id: 2,
      variant: "live",
      status: "LIVE",
      prizePool: 0.5,
      timeRemaining: ROUND_DURATION.LIVE,
      currentPrice: currentPrice,
      startTime: now,
      endTime: now + ROUND_DURATION.TOTAL * 1000,
      upBets: 0.3,
      downBets: 0.2,
      totalBets: 5,
      liveBets: [],
    },
    // Next upcoming round
    {
      id: 3,
      variant: "next",
      status: "UPCOMING",
      prizePool: 0.1,
      timeRemaining: ROUND_DURATION.TOTAL,
      startTime: now + ROUND_DURATION.TOTAL * 1000,
      endTime: now + ROUND_DURATION.TOTAL * 2000,
      upBets: 0,
      downBets: 0,
      totalBets: 0,
      liveBets: [],
    },
    // Later round with entry timer
    {
      id: 4,
      variant: "later",
      status: "LATER",
      prizePool: 0,
      entryStartsIn: ROUND_DURATION.ENTRY_WAIT, // 10 minutes countdown
      timeRemaining: ROUND_DURATION.TOTAL + ROUND_DURATION.ENTRY_WAIT,
      startTime: now + ROUND_DURATION.TOTAL * 2000 + ROUND_DURATION.ENTRY_WAIT * 1000,
      endTime: now + ROUND_DURATION.TOTAL * 3000 + ROUND_DURATION.ENTRY_WAIT * 1000,
      upBets: 0,
      downBets: 0,
      totalBets: 0,
      liveBets: [],
    }
  ];
};

/**
 * Custom hook for managing prediction game rounds
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.wallet - Wallet connection info
 * @param {Function} options.signTransaction - Transaction signing function
 * @param {Object} options.connection - Solana connection
 * @param {Object} options.contractAddress - Prediction contract address
 * @returns {Object} Round management state and functions
 */
export function useRoundManager({
  wallet = {},
  signTransaction,
  connection,
  contractAddress,
}) {
  const { publicKey, connected } = wallet;

  // Core state
  const [currentPrice, setCurrentPrice] = useState(0);
  const [historicalPrices, setHistoricalPrices] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [liveBets, setLiveBets] = useState([]);
  const [userBalance, setUserBalance] = useState(0);
  const [claimableRewards, setClaimableRewards] = useState(0);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with price data
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get current price
        const price = await getPriceData();
        setCurrentPrice(price);

        // Generate mock historical data
        const now = Date.now();
        const historicalData = Array.from({ length: 60 }, (_, i) => {
          const time = now - (59 - i) * 5000;
          const fluctuation = Math.random() * 10 - 5; // ±5
          return {
            time,
            price: price + fluctuation,
          };
        });

        setHistoricalPrices(historicalData);

        // Create initial rounds
        setRounds(generateInitialRounds(price));

        // Generate some mock live bets
        const initialLiveBets = Array(19)
          .fill(null)
          .map(() => ({
            user: `User${Math.floor(Math.random() * 1000)}`,
            amount: (Math.random() * 2).toFixed(2),
            direction: Math.random() > 0.5 ? "UP" : "DOWN",
          }));
        setLiveBets(initialLiveBets);

        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing round manager:", error);
        toast.error("Failed to initialize prediction game");
      }
    };

    initialize();

    // Start price polling
    const pollingId = setInterval(async () => {
      try {
        const price = await getPriceData();
        setCurrentPrice(price);

        setHistoricalPrices((prev) => {
          const newData = [...prev, { time: Date.now(), price }];
          return newData.length > 60 ? newData.slice(-60) : newData;
        });
      } catch (err) {
        console.error("Error polling price:", err);
      }
    }, 30000); // every 30 seconds for demo (would be 5 min in production)

    return () => clearInterval(pollingId);
  }, []);

  // Load user data when wallet connects
  useEffect(() => {
    if (!connected || !publicKey || !connection) return;

    const loadUserData = async () => {
      try {
        // Get user balance
        const balance = await connection.getBalance(publicKey);
        setUserBalance(balance / 1000000000); // Convert lamports to SOL

        // Load user bets from localStorage
        const savedBets = localStorage.getItem(`bets_${publicKey.toString()}`);
        if (savedBets) {
          setUserBets(JSON.parse(savedBets));
        }

        // Check for claimable rewards
        checkForClaimableRewards();
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    loadUserData();
  }, [connected, publicKey, connection]);

  // Round timer management
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setInterval(() => {
      setRounds((prevRounds) => {
        // Process each round
        const updatedRounds = prevRounds.map((round) => {
          // Skip ended rounds
          if (round.status === "ENDED") return round;

          // For active rounds, decrease time
          let timeRemaining = round.timeRemaining - 1;
          let status = round.status;
          let variant = round.variant;
          
          // Handle the "LATER" round with entry timer
          if (round.status === "LATER") {
            // Decrease entry timer
            const entryStartsIn = (round.entryStartsIn || 0) - 1;
            
            // Check if entry timer is completed
            if (entryStartsIn <= 0) {
              // Entry period starts, convert to UPCOMING
              status = "UPCOMING";
              variant = "next";
              return { ...round, status, variant, entryStartsIn: 0, timeRemaining };
            }
            
            return { ...round, entryStartsIn, timeRemaining };
          }
          // Calculate if status needs to change
          else if (round.status === "LIVE" && timeRemaining <= 0) {
            // Round becomes locked
            status = "LOCKED";
            timeRemaining = ROUND_DURATION.LOCK;
            // Record lock price
            return { ...round, status, timeRemaining, lockPrice: currentPrice };
          } else if (round.status === "LOCKED" && timeRemaining <= 0) {
            // Round ends
            status = "ENDED";
            variant = "expired";
            // Record close price
            return {
              ...round,
              status,
              variant,
              timeRemaining: 0,
              closePrice: currentPrice,
            };
          } else if (
            round.status === "UPCOMING" &&
            prevRounds.some((r) => r.status === "LIVE" && r.timeRemaining <= 30)
          ) {
            // Next round becomes live when current round is about to lock (30s buffer)
            // status = "LIVE";
            // variant = "live";
            // timeRemaining = ROUND_DURATION.LIVE;
            // return { ...round, status, variant, timeRemaining };
          }

          return { ...round, timeRemaining };
        });

        // Check if we need to add a new "LATER" round
        const laterRoundExists = updatedRounds.some(round => round.status === "LATER");
        if (!laterRoundExists) {
          // Find the highest ID
          const maxId = Math.max(...updatedRounds.map(round => round.id));
          const now = Date.now();
          
          // Create a new "LATER" round
          const newLaterRound = {
            id: maxId + 1,
            variant: "later",
            status: "LATER",
            prizePool: 0,
            entryStartsIn: ROUND_DURATION.ENTRY_WAIT, // 10 minute countdown
            timeRemaining: ROUND_DURATION.TOTAL + ROUND_DURATION.ENTRY_WAIT,
            startTime: now + ROUND_DURATION.TOTAL * 2000 + ROUND_DURATION.ENTRY_WAIT * 1000,
            endTime: now + ROUND_DURATION.TOTAL * 3000 + ROUND_DURATION.ENTRY_WAIT * 1000,
            upBets: 0,
            downBets: 0,
            totalBets: 0,
            liveBets: [],
          };
          
          updatedRounds.push(newLaterRound);
        }
        
        // Check if we need to add a new upcoming round
        if (!updatedRounds.some((round) => round.status === "UPCOMING")) {
          // Find latest round
          const latestActiveRound = [...updatedRounds]
            .filter(r => r.status !== "ENDED" && r.status !== "LATER")
            .sort((a, b) => b.id - a.id)[0];
            
          if (latestActiveRound) {
            const newRound = {
              id: latestActiveRound.id + 1,
              variant: "next",
              status: "UPCOMING",
              prizePool: 0.1,
              timeRemaining: ROUND_DURATION.TOTAL,
              startTime: Date.now() + ROUND_DURATION.LIVE * 1000,
              endTime: Date.now() + ROUND_DURATION.TOTAL * 1000,
              upBets: 0,
              downBets: 0,
              totalBets: 0,
              liveBets: [],
            };
            updatedRounds.push(newRound);
          }
        }

        // Maintain only 5 rounds: 2 expired, 1 live, 1 upcoming, 1 later
        if (updatedRounds.length > 5) {
          // Sort by ID to get chronological order
          updatedRounds.sort((a, b) => a.id - b.id);
          
          // Count ended rounds
          const endedRounds = updatedRounds.filter(r => r.status === "ENDED");
          
          // If we have more than 2 ended rounds, remove the oldest ones
          while (endedRounds.length > 2 && updatedRounds.length > 5) {
            const oldestEndedIndex = updatedRounds.findIndex(r => r.status === "ENDED");
            if (oldestEndedIndex !== -1) {
              updatedRounds.splice(oldestEndedIndex, 1);
              endedRounds.shift();
            }
          }
          
          // If we still have more than 5 rounds, remove excess rounds
          while (updatedRounds.length > 5) {
            // Try to maintain the balance of different round types
            if (updatedRounds.filter(r => r.status === "LATER").length > 1) {
              // Remove excess LATER rounds first
              const latestLaterIndex = updatedRounds.findIndex(r => r.status === "LATER");
              updatedRounds.splice(latestLaterIndex, 1);
            } else {
              // Remove oldest round as a fallback
              updatedRounds.shift();
            }
          }
        }

        return updatedRounds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInitialized, currentPrice]);

  // Update user bets when rounds complete
  useEffect(() => {
    if (!isInitialized) return;

    // Find ended rounds that have user bets
    const endedRounds = rounds.filter((r) => r.status === "ENDED");
    if (endedRounds.length === 0) return;

    // Update user bets for ended rounds
    const updatedUserBets = userBets.map((bet) => {
      const endedRound = endedRounds.find((r) => r.id === bet.roundId);
      if (endedRound && bet.status === "PENDING") {
        // Determine if bet won
        const isWinner =
          (bet.direction === "up" &&
            endedRound.closePrice > endedRound.lockPrice) ||
          (bet.direction === "down" &&
            endedRound.closePrice < endedRound.lockPrice);

        // Calculate payout - winners get 2.51x their bet
        const payout = isWinner ? bet.amount * 2.51 : 0;

        return {
          ...bet,
          status: isWinner ? "WON" : "LOST",
          payout,
          claimed: false, // Will be set to true when user claims
        };
      }
      return bet;
    });

    // Only update state if there were changes
    if (JSON.stringify(updatedUserBets) !== JSON.stringify(userBets)) {
      setUserBets(updatedUserBets);
      saveUserBets(updatedUserBets);

      // Check for new claimable rewards
      const newClaimable = updatedUserBets
        .filter((bet) => bet.status === "WON" && !bet.claimed)
        .reduce((total, bet) => total + bet.payout, 0);

      if (newClaimable > 0) {
        setClaimableRewards((prev) => prev + newClaimable);
        toast.success(
          `You won ${newClaimable.toFixed(4)} SOL! Claim your rewards.`
        );
      }
    }
  }, [rounds, userBets, isInitialized]);

  // Save user bets to local storage
  const saveUserBets = useCallback(
    (bets) => {
      if (!connected || !publicKey) return;

      try {
        localStorage.setItem(
          `bets_${publicKey.toString()}`,
          JSON.stringify(bets)
        );
      } catch (error) {
        console.error("Error saving user bets:", error);
      }
    },
    [connected, publicKey]
  );

  // Check for claimable rewards
  const checkForClaimableRewards = useCallback(() => {
    if (!connected || !publicKey) return;

    try {
      // In a real implementation, this would query the smart contract
      // For now, we'll calculate from our local state
      const claimableBets = userBets.filter(
        (bet) => bet.status === "WON" && !bet.claimed
      );

      const totalClaimable = claimableBets.reduce(
        (total, bet) => total + bet.payout,
        0
      );
      setClaimableRewards(totalClaimable);
    } catch (error) {
      console.error("Error checking for claimable rewards:", error);
    }
  }, [connected, publicKey, userBets]);

  // Handle bet placement
  const handlePlaceBet = async (direction, amount, roundId) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (isProcessingAction) {
      toast.error("Transaction in progress, please wait");
      return;
    }

    const targetRound = rounds.find((r) => r.id === roundId);
    if (!targetRound || targetRound.status !== "UPCOMING") {
      toast.error("This round is not accepting bets anymore");
      return;
    }

    if (amount <= 0 || amount > userBalance) {
      toast.error("Invalid bet amount");
      return;
    }

    setIsProcessingAction(true);
    const toastId = toast.loading("Processing your bet...");

    try {
      let txHash = ""; // In real implementation, this would come from contract

      if (connection && contractAddress && signTransaction) {
        // In production, uncomment this to use real contract interaction
        const programId = new PublicKey(
          "6PNkQGtvavCwxpbh4MTKz6dhkDrqqJXYbjRn653DUXLh"
        );
        const contractPubKey = new PublicKey(contractAddress);

        // Check round status first
        const roundStatus = await checkRoundStatus(connection, programId,roundId);
        console.log("Round status:", roundStatus);

        // Place the bet on-chain
        txHash = await placeBet(
          connection,
          programId,
          contractPubKey,
          publicKey,
          signTransaction,
          roundId,
          direction,
          amount
        );
      }

      // Add to user bets
      const newBet = {
        id: Date.now(),
        roundId,
        direction,
        amount,
        timestamp: Date.now(),
        wallet: publicKey.toString(),
        walletDisplay: truncateAddress(publicKey.toString()),
        status: "PENDING",
        txHash,
      };

      const updatedUserBets = [...userBets, newBet];
      setUserBets(updatedUserBets);
      saveUserBets(updatedUserBets);

      // Add to live bets
      const newLiveBet = {
        user: truncateAddress(publicKey.toString()),
        amount,
        direction: direction.toUpperCase(),
      };
      setLiveBets([newLiveBet, ...liveBets].slice(0, 20));

      // Update prize pool and bet counts
      setRounds((prevRounds) =>
        prevRounds.map((round) => {
          if (round.id === roundId) {
            const updatedUpBets =
              direction === "up" ? round.upBets + amount : round.upBets;
            const updatedDownBets =
              direction === "down" ? round.downBets + amount : round.downBets;
            return {
              ...round,
              prizePool: +(round.prizePool + amount).toFixed(4),
              upBets: updatedUpBets,
              downBets: updatedDownBets,
              totalBets: round.totalBets + 1,
            };
          }
          return round;
        })
      );

      // Update user balance (subtract bet amount)
      setUserBalance((prev) => prev - amount);

      toast.dismiss(toastId);
      toast.success(`${amount} SOL placed on ${direction.toUpperCase()}`);
    } catch (error) {
      console.error("Error placing bet:", error);
      toast.dismiss(toastId);
      toast.error("Failed to place bet: " + error.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle claiming rewards
  const handleClaimRewards = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (claimableRewards <= 0) {
      toast.error("No rewards to claim");
      return;
    }

    if (isProcessingAction) {
      toast.error("Transaction in progress, please wait");
      return;
    }

    setIsProcessingAction(true);
    const toastId = toast.loading("Claiming your rewards...");

    try {
      let txHash = "mock-claim-tx-hash";

      if (connection && contractAddress && signTransaction) {
        // In production, uncomment this to use real contract interaction
        /*
        const contractPubKey = new PublicKey(contractAddress);
        txHash = await claimPayout(
          connection,
          contractPubKey,
          publicKey,
          signTransaction
        );
        */
      }

      // Update user bets to mark them as claimed
      const updatedUserBets = userBets.map((bet) =>
        bet.status === "WON" && !bet.claimed ? { ...bet, claimed: true } : bet
      );
      setUserBets(updatedUserBets);
      saveUserBets(updatedUserBets);

      // Update user balance (add reward amount)
      setUserBalance((prev) => prev + claimableRewards);

      // Reset claimable rewards
      setClaimableRewards(0);

      toast.dismiss(toastId);
      toast.success(`Successfully claimed ${claimableRewards.toFixed(4)} SOL`);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.dismiss(toastId);
      toast.error("Failed to claim rewards: " + error.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Find active round
  const getActiveRoundId = useCallback(() => {
    const liveRound = rounds.find((r) => r.status === "LIVE");
    return liveRound ? liveRound.id : null;
  }, [rounds]);

  // Get formatted entry start time for later round
  const getEntryStartTime = useCallback(() => {
    const laterRound = rounds.find((r) => r.status === "LATER");
    if (!laterRound || !laterRound.entryStartsIn) return "00:00";
    return formatTime(laterRound.entryStartsIn);
  }, [rounds]);

  // Check if a round is active for betting
  const isRoundBettable = useCallback(
    (roundId) => {
      const round = rounds.find(r => r.id === roundId);
      if (!round) return false;
      
      // Can only bet on UPCOMING rounds
      return round.status === "UPCOMING";
    },
    [rounds]
  );

  // Start a new round manually (for testing/admin purposes)
  const startNewRound = useCallback(() => {
    setRounds((prevRounds) => {
      const lastRound = prevRounds[prevRounds.length - 1];
      const newRound = {
        id: lastRound.id + 1,
        variant: "later",
        status: "LATER",
        prizePool: 0,
        entryStartsIn: ROUND_DURATION.ENTRY_WAIT,
        timeRemaining: ROUND_DURATION.TOTAL + ROUND_DURATION.ENTRY_WAIT,
        startTime: Date.now() + ROUND_DURATION.TOTAL * 2000 + ROUND_DURATION.ENTRY_WAIT * 1000,
        endTime: Date.now() + ROUND_DURATION.TOTAL * 3000 + ROUND_DURATION.ENTRY_WAIT * 1000,
        upBets: 0,
        downBets: 0,
        totalBets: 0,
        liveBets: [],
      };
      return [...prevRounds, newRound];
    });
  }, []);

  return {
    rounds,
    currentPrice,
    historicalPrices,
    liveBets,
    userBets,
    userBalance,
    claimableRewards,
    isProcessingAction,
    // Actions
    placeBet: handlePlaceBet,
    claimRewards: handleClaimRewards,
    checkClaimableRewards: checkForClaimableRewards,
    startNewRound,
    isRoundBettable,
    getActiveRoundId,
    getEntryStartTime,
    // Constants
    ROUND_DURATION,
    // Helpers
    formatTime,
  };
}
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { getPriceData } from "@/lib/price-utils";
import { checkRoundStatus, placeBet, claimPayout } from "@/lib/contract-utils";
import { PublicKey } from "@solana/web3.js";
import { setRoundStart, hasRoundConfigChanged } from "./time-manager";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";

// Helper to truncate wallet addresses
const truncateAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

// Format seconds into mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

// Fetch configuration from API
export const fetchConfig = async () => {
  try {
    const response = await fetch(
      "https://sol-prediction-backend.onrender.com/round/config"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch configuration");
    }
    const configData = await response.json();

    // Store the config in state and initialize timer if necessary
    if (configData?.roundDuration && configData?.currentRound) {
      // Check if we need to update the timer (first load or config changed)
      const shouldUpdateTimer = await hasRoundConfigChanged(
        parseInt(configData.roundDuration),
        parseInt(configData.currentRound)
      );

      if (shouldUpdateTimer) {
        // Update timer with new round details
        await setRoundStart(
          parseInt(configData.roundDuration),
          parseInt(configData.currentRound)
        );
      }
    }

    return configData;
  } catch (error) {
    console.error("Error fetching configuration:", error);
    toast.error("Failed to fetch game configuration");
    return null;
  }
};

// Generate rounds based on config and current price
const generateRoundsFromConfig = (currentPrice, config, timerInfo) => {
  const now = Date.now();
  const roundDuration = parseInt(config.roundDuration); // Total round duration in seconds
  const lockDuration = parseInt(config.lockDuration || "30"); // Lock duration in seconds
  const liveDuration = roundDuration - lockDuration; // Live duration in seconds
  const currentRound = parseInt(config.currentRound);

  // Calculate progress within round
  const elapsedPercentage = timerInfo.elapsedPercentage;
  const isLockPhase =
    elapsedPercentage > ((roundDuration - lockDuration) / roundDuration) * 100;
  const timeRemaining = timerInfo.remainingSeconds;

  const rounds = [];

  // Expired round (previous round)
  if (currentRound > 2) {
    rounds.push({
      id: currentRound - 2,
      variant: "expired",
      status: "ENDED",
      prizePool: 8.6015,
      timeRemaining: 0,
      lockPrice: currentPrice - 2.0,
      closePrice: currentPrice - 1.5,
      startTime: now - roundDuration * 2000,
      endTime: now - roundDuration * 1000,
      upBets: 4.3,
      downBets: 4.3015,
      totalBets: 12,
      liveBets: [],
    });
  }

  // Current live round
  if (currentRound > 1) {
    rounds.push({
      id: currentRound - 1,
      variant: "live",
      status: isLockPhase ? "LOCKED" : "LIVE",
      prizePool: 0.5,
      timeRemaining: timeRemaining,
      currentPrice: currentPrice,
      lockPrice: isLockPhase ? currentPrice : null, // Set lock price when entering lock phase
      startTime: now - (elapsedPercentage / 100) * roundDuration * 1000, // Adjust based on elapsed time
      endTime: now + timeRemaining * 1000,
      upBets: 0.3,
      downBets: 0.2,
      totalBets: 5,
      liveBets: [],
    });
  }

  // Next round (where users can place bets)
  rounds.push({
    id: currentRound,
    variant: "next",
    status: "UPCOMING",
    prizePool: 0.1,
    timeRemaining: roundDuration,
    startTime: now + timeRemaining * 1000,
    endTime: now + (timeRemaining + roundDuration) * 1000,
    upBets: 0,
    downBets: 0,
    totalBets: 0,
    liveBets: [],
  });

  // Later round
  rounds.push({
    id: currentRound+1,
    variant: "later",
    status: "LATER",
    prizePool: 0,
    timeRemaining: liveDuration,
    entryStartsIn: timeRemaining + roundDuration,
    startTime: now + (timeRemaining + roundDuration) * 1000,
    endTime: now + (timeRemaining + roundDuration * 2) * 1000,
    upBets: 0,
    downBets: 0,
    totalBets: 0,
    liveBets: [],
  });

  return rounds;
};

export function useRoundManager({
  wallet = {},
  signTransaction,
  sendTransaction,
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
  const [config, setConfig] = useState(null);
  const [roundTransitionInProgress, setRoundTransitionInProgress] = useState(false);

  // Use the enhanced countdown timer
  const {
    formattedTime,
    remainingSeconds,
    elapsedPercentage,
    currentRound,
    isRoundEnding,
  } = useCountdownTimer();

  // Initialize with price data and configuration
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get config first
        const configData = await fetchConfig();

        setConfig(configData);
        if (!configData) return;

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
    }, 10000); // every 10 seconds for demo

    return () => {
      clearInterval(pollingId);
    };
  }, []);

  // Effect to update rounds data based on timer
  useEffect(() => {
    if (config && currentPrice > 0) {
      setRounds(
        generateRoundsFromConfig(currentPrice, config, {
          remainingSeconds,
          elapsedPercentage,
          currentRound: currentRound || parseInt(config.currentRound),
        })
      );
    }
  }, [remainingSeconds, currentPrice, config, currentRound, elapsedPercentage]);

  // Effect for handling round transitions when timer reaches zero
  useEffect(() => {
    const handleRoundTransition = async () => {
      // Check if round is ending and timer is at or near zero
      if (isRoundEnding && remainingSeconds <= 1 && !roundTransitionInProgress) {
        console.log("Round ending, preparing transition...");
        setRoundTransitionInProgress(true);
        
        try {
          console.log("Round ended, fetching new configuration...");
          // Fetch the latest configuration from the API
          const configData = await fetchConfig();
          
          console.log("New config data:", configData);
          
          if (configData) {
            // Update the config in state which will trigger round regeneration
            setConfig(configData);
            
            // Let the timer mechanism reset if needed
            if (configData.currentRound) {
              // Force an update of the time manager with new round info
              await setRoundStart(
                parseInt(configData.roundDuration),
                parseInt(configData.currentRound)
              );
            }
          }
        } catch (error) {
          console.error("Error during round transition:", error);
          toast.error("Failed to update round information");
        } finally {
          // Reset transition flag after a short delay to prevent multiple triggers
          setTimeout(() => {
            setRoundTransitionInProgress(false);
          }, 2000);
        }
      }
    };

    handleRoundTransition();
  }, [remainingSeconds, isRoundEnding, roundTransitionInProgress]);

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

  // Round timer management - this is where the main flow happens
  useEffect(() => {
    if (!isInitialized || !config) return;

    const timer = setInterval(() => {
      setRounds((prevRounds) => {
        // Create a deep copy to work with
        const updatedRounds = JSON.parse(JSON.stringify(prevRounds));

        // Get durations from config
        const roundDuration = parseInt(config.roundDuration);
        const lockDuration = parseInt(config.lockDuration || "30");
        const liveDuration = roundDuration - lockDuration;

        // Sort rounds by ID to make sure they're in chronological order
        updatedRounds.sort((a, b) => a.id - b.id);

        // Process each round
        for (let i = 0; i < updatedRounds.length; i++) {
          const round = updatedRounds[i];

          // Only process rounds with timers
          if (round.status !== "ENDED") {
            round.timeRemaining = Math.max(0, round.timeRemaining - 1);
          }

          // Process transitions for rounds based on their current status
          if (round.status === "LIVE" && round.timeRemaining <= 0) {
            // LIVE -> LOCKED transition
            round.status = "LOCKED";
            round.variant = "locked"; // Add variant for styling
            round.timeRemaining = lockDuration;
            round.lockPrice = currentPrice;
            console.log(`Round ${round.id} LIVE -> LOCKED`);

            // Find the upcoming round and make it LIVE
            const nextRound = updatedRounds.find(
              (r) => r.status === "UPCOMING"
            );
            if (nextRound) {
              nextRound.status = "LIVE";
              nextRound.variant = "live";
              nextRound.timeRemaining = liveDuration;
              nextRound.currentPrice = currentPrice;
              console.log(`Round ${nextRound.id} UPCOMING -> LIVE`);
            }

            // Convert LATER to UPCOMING (next)
            const laterRound = updatedRounds.find((r) => r.status === "LATER");
            if (laterRound) {
              laterRound.status = "UPCOMING";
              laterRound.variant = "next";
              laterRound.entryStartsIn = 0;
              console.log(`Round ${laterRound.id} LATER -> UPCOMING`);
            }

            // Create a new LATER round
            const maxId = Math.max(...updatedRounds.map((r) => r.id));
            const now = Date.now();

            const newLaterRound = {
              id: maxId + 1,
              variant: "later",
              status: "LATER",
              prizePool: 0,
              timeRemaining: liveDuration,
              entryStartsIn: liveDuration + lockDuration,
              startTime: now + roundDuration * 1000,
              endTime: now + roundDuration * 2000,
              upBets: 0,
              downBets: 0,
              totalBets: 0,
              liveBets: [],
            };

            updatedRounds.push(newLaterRound);
            console.log(`Created new LATER round with ID ${newLaterRound.id}`);
          } else if (round.status === "LOCKED" && round.timeRemaining <= 0) {
            // LOCKED -> ENDED transition
            round.status = "ENDED";
            round.variant = "expired";
            round.closePrice = currentPrice;
            console.log(`Round ${round.id} LOCKED -> ENDED`);
          } else if (round.status === "LATER") {
            // Update entry timer for LATER rounds
            if (round.entryStartsIn > 0) {
              round.entryStartsIn = Math.max(0, round.entryStartsIn - 1);
            }
          }
        }

        // Clean up rounds - keep only one ENDED, one LIVE, one UPCOMING, one LATER
        const endedRounds = updatedRounds.filter((r) => r.status === "ENDED");

        // Keep only the most recent ended round
        if (endedRounds.length > 1) {
          // Sort ended rounds by ID (descending) to get the newest first
          endedRounds.sort((a, b) => b.id - a.id);

          // Keep only the most recent ended round
          for (let i = 1; i < endedRounds.length; i++) {
            const roundToRemove = endedRounds[i];
            const indexToRemove = updatedRounds.findIndex(
              (r) => r.id === roundToRemove.id
            );
            if (indexToRemove !== -1) {
              updatedRounds.splice(indexToRemove, 1);
            }
          }
        }

        // Ensure we have exactly one of each status type
        const statuses = ["ENDED", "LOCKED", "LIVE", "UPCOMING", "LATER"];
        for (const status of statuses) {
          const roundsWithStatus = updatedRounds.filter(
            (r) => r.status === status
          );
          if (roundsWithStatus.length > 1) {
            // Keep the newest (highest ID) for each status
            roundsWithStatus.sort((a, b) => b.id - a.id);
            for (let i = 1; i < roundsWithStatus.length; i++) {
              const indexToRemove = updatedRounds.findIndex(
                (r) => r.id === roundsWithStatus[i].id
              );
              if (indexToRemove !== -1) {
                updatedRounds.splice(indexToRemove, 1);
              }
            }
          }
        }

        // Sort rounds by ID again to maintain correct order
        updatedRounds.sort((a, b) => a.id - b.id);

        return updatedRounds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInitialized, currentPrice, config]);

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

    // Check minimum bet amount from config
    if (config && amount * 1e9 < parseInt(config.minBetAmount)) {
      toast.error(
        `Minimum bet amount is ${parseInt(config.minBetAmount) / 1e9} SOL`
      );
      return;
    }

    setIsProcessingAction(true);
    const toastId = toast.loading("Processing your bet...");

    try {
      let txHash = ""; // In real implementation, this would come from contract

      if (connection && contractAddress && signTransaction) {
        // In production, uncomment this to use real contract interaction
        const programId = new PublicKey(
          "CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT"
        );
        const contractPubKey = new PublicKey(contractAddress);

        // Place the bet on-chain
        txHash = await placeBet(
          connection,
          programId,
          contractPubKey,
          publicKey,
          signTransaction,
          sendTransaction,
          roundId,
          direction,
          amount
        );
      }

      console.log("====================================");
      console.log(txHash, "txhash");
      console.log("====================================");

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
      toast.error("Failed to place bet, Try again");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle claiming rewards
  const handleClaimRewards = async (roundId) => {
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
        const programId = new PublicKey(
          "CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT"
        );
        const contractPubKey = new PublicKey(contractAddress);

        // Place the bet on-chain
        txHash = await claimPayout(
          connection,
          programId,
          contractPubKey,
          publicKey,
          signTransaction,
          sendTransaction,
          roundId
        );

        console.log("====================================");
        console.log(txHash, "txhash");
        console.log("====================================");
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
      toast.error("Failed to claim rewards Try again ");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Find active round
  // Get the active round ID
  const getActiveRoundId = useCallback(() => {
    if (!config) return 0;
    return parseInt(config.currentRound) - 1;
  }, [config]);

  // Get formatted entry start time for later round
  const getEntryStartTime = useCallback(() => {
    // Find the live round to sync the timer
    const liveRound = rounds.find((r) => r.status === "LIVE");
    if (liveRound) {
      return formatTime(liveRound.timeRemaining);
    }

    // Fallback
    const laterRound = rounds.find((r) => r.status === "LATER");
    if (laterRound && laterRound.entryStartsIn) {
      return formatTime(laterRound.entryStartsIn);
    }

    return "00:00";
  }, [rounds]);

  // Check if a round is bettable
  const isRoundBettable = useCallback(
    (roundId) => {
      if (!config) return false;

      const currentRoundNumber = parseInt(config.currentRound);

      // Can only bet on the next upcoming round
      return roundId === currentRoundNumber && remainingSeconds > 10;
    },
    [config, remainingSeconds]
  );

  // Get round durations from config
  const getRoundDurations = useCallback(() => {
    if (!config) return { LIVE: 300, LOCK: 30, TOTAL: 330 };

    const roundDuration = parseInt(config.roundDuration);
    const lockDuration = parseInt(config.lockDuration || "30");
    const liveDuration = roundDuration - lockDuration;

    return {
      LIVE: liveDuration,
      LOCK: lockDuration,
      TOTAL: roundDuration,
    };
  }, [config]);

  return {
    rounds,
    currentPrice,
    historicalPrices,
    liveBets,
    userBets,
    userBalance,
    claimableRewards,
    isProcessingAction,
    config,
    // Actions
    placeBet: handlePlaceBet,
    claimRewards: handleClaimRewards,
    checkClaimableRewards: checkForClaimableRewards,
    isRoundBettable,
    getActiveRoundId,
    getEntryStartTime,
    // Constants
    ROUND_DURATION: getRoundDurations(),
    // Helpers
    formatTime,
  };
}
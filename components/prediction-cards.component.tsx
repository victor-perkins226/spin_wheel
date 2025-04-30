"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Chart from "chart.js/auto";
import { useTheme } from "next-themes";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import LineChart from "./LineChart";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { toast } from "react-hot-toast";

// Constants for round durations
const ROUND_DURATION = {
  LIVE: 120, // 2 minutes in seconds
  LOCK: 30, // 30 seconds locked
};

// Mock API for price feeds - in production this would connect to an oracle
// const getPriceData = async () => {
//   // In production, you would use a price oracle like Pyth or Switchboard
//   // For now, we'll simulate price data with small random changes
//   return fetch(
//     "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
//   )
//     .then((response) => response.json())
//     .then((data) => data.solana.usd)
//     .catch((error) => {
//       console.error("Error fetching price:", error);
//       // Return a random price if API fails
//       return 50 + Math.random() * 10;
//     });
// };

const MobileLiveBets = ({ liveBets }) => {
  return (
    <div className="w-full glass px-3 py-4 rounded-lg mt-2">
      <h3 className="font-semibold text-base mb-3">Live Bets</h3>
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-2 text-xs">User</th>
              <th className="pb-2 text-xs">Amount</th>
              <th className="pb-2 text-xs">Position</th>
            </tr>
          </thead>
          <tbody>
            {liveBets.map((bet, key) => (
              <tr key={key} className="font-semibold text-xs">
                <td className="py-2">
                  <div className="flex gap-1 items-center">
                    <SVG width={20} height={20} iconName="avatar" />
                    {bet.user}
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    <Image
                      className="w-[20px] h-auto object-contain"
                      src={SolanaLogo}
                      alt=""
                    />
                    {bet.amount} SOL
                  </div>
                </td>
                <td
                  className={`py-2 ${
                    bet.direction === "UP" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {bet.direction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper to truncate wallet addresses
const truncateAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef(null);
  const { publicKey, connected, signTransaction, sendTransaction } =
    useWallet();

  // State for prediction game
  const [rounds, setRounds] = useState([
    {
      id: 1,
      variant: "expired",
      status: "ENDED",
      lockPrice: 534.12,
      closePrice: 535.67,
      prizePool: 8.6015,
      timeRemaining: 0,
      liveBets: [],
      upBets: 0,
      downBets: 0,
      totalBets: 0,
      startTime:
        Date.now() - (ROUND_DURATION.LIVE + ROUND_DURATION.LOCK + 10) * 1000, // 10 seconds ago
      endTime: Date.now() - 10000, // 10 seconds ago
    },
    {
      id: 2,
      variant: "live",
      status: "LIVE",
      currentPrice: 535.67,
      prizePool: 5.4312,
      timeRemaining: ROUND_DURATION.LIVE,
      liveBets: [],
      upBets: 0,
      downBets: 0,
      totalBets: 0,
      startTime: Date.now(),
      endTime: Date.now() + ROUND_DURATION.LIVE * 1000,
    },
    {
      id: 3,
      variant: "next",
      status: "UPCOMING",
      prizePool: 0.1,
      timeRemaining: ROUND_DURATION.LIVE + ROUND_DURATION.LOCK,
      liveBets: [],
      upBets: 0,
      downBets: 0,
      totalBets: 0,
      startTime: Date.now() + ROUND_DURATION.LIVE * 1000,
      endTime:
        Date.now() + (ROUND_DURATION.LIVE * 2 + ROUND_DURATION.LOCK) * 1000,
    },
  ]);

  const [liveBets, setLiveBets] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(535.67);
  const [userBalance, setUserBalance] = useState(0);
  const [historicalPrices, setHistoricalPrices] = useState([]);
  const [claimableRewards, setClaimableRewards] = useState(0);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Create reference to connection object
  const connectionRef = useRef(null);

  // Initialize app and connection
  useEffect(() => {
    setMounted(true);

    // Initialize Solana connection
    connectionRef.current = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);

    // Initialize mock data for UI demonstration
    const initialLiveBets = Array(19)
      .fill(null)
      .map((_, index) => ({
        user: `User${Math.floor(Math.random() * 1000)}`,
        amount: (Math.random() * 2).toFixed(2),
        direction: Math.random() > 0.5 ? "UP" : "DOWN",
      }));
    setLiveBets(initialLiveBets);

    // Start fetching price data
    fetchInitialPriceData();  

    return () => {
      window.removeEventListener("resize", updateScreenWidth);
      if (swiperRef.current && swiperRef.current.destroy) {
        swiperRef.current.destroy(true, true);
      }
    };
  }, []);

  // Fetch user's SOL balance when wallet is connected
  useEffect(() => {
    if (!connected || !publicKey || !connectionRef.current) return;

    const fetchBalance = async () => {
      try {
        const balance = await connectionRef.current.getBalance(publicKey);
        setUserBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Error fetching balance:", error);
        toast.error("Failed to fetch wallet balance");
      }
    };

    fetchBalance();

    // Also check for any unclaimed rewards
    checkForClaimableRewards();

    // Load user's past bets
    loadUserBets();
  }, [connected, publicKey]);

  // Fetch initial price data and historical prices
  const fetchInitialPriceData = async () => {
    try {
      const currentPrice = await getPriceData();
      setCurrentPrice(currentPrice);

      // Generate some mock historical data for the chart
      const now = Date.now();
      const historicalData = [];

      for (let i = 0; i < 60; i++) {
        const time = now - (59 - i) * 5000; // 5 seconds apart
        const basePrice = currentPrice - Math.random() * 5;
        const price = basePrice + Math.random() * 10;

        historicalData.push({
          time,
          price,
        });
      }

      setHistoricalPrices(historicalData);
    } catch (error) {
      console.error("Error fetching initial price data:", error);
    }
  };

  // Check for claimable rewards
  const checkForClaimableRewards = useCallback(() => {
    if (!connected || !publicKey) return;

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
  }, [connected, publicKey, userBets]);

  // Load user's past bets
  const loadUserBets = useCallback(() => {
    if (!connected || !publicKey) return;

    // In a real implementation, this would query the smart contract
    // For demo, we'll just use local storage to persist bets between sessions
    try {
      const savedBets = localStorage.getItem(`bets_${publicKey.toString()}`);
      if (savedBets) {
        setUserBets(JSON.parse(savedBets));
      }
    } catch (error) {
      console.error("Error loading user bets:", error);
    }
  }, [connected, publicKey]);

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

  // Simulate price changes
  useEffect(() => {
    const priceInterval = setInterval(async () => {
      try {
        // In production, fetch from oracle
        const newPrice = await getPriceData();

        // Update current price
        setCurrentPrice(newPrice);

        // Update current round price
        setRounds((prevRounds) =>
          prevRounds.map((round) =>
            round.variant === "live"
              ? { ...round, currentPrice: newPrice }
              : round
          )
        );

        // Add to historical prices
        setHistoricalPrices((prev) => {
          const newData = [...prev, { time: Date.now(), price: newPrice }];
          // Keep last 60 data points
          if (newData.length > 60) {
            return newData.slice(-60);
          }
          return newData;
        });
      } catch (error) {
        console.error("Error updating price:", error);
      }
    }, 5000);

    return () => clearInterval(priceInterval);
  }, []);

  // Round timer management
  useEffect(() => {
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

          // Calculate if status needs to change
          if (round.status === "LIVE" && timeRemaining <= 0) {
            // Round becomes locked
            status = "LOCKED";
            timeRemaining = ROUND_DURATION.LOCK;
            // Record lock price
            return { ...round, status, timeRemaining, lockPrice: currentPrice };
          } else if (round.status === "LOCKED" && timeRemaining <= 0) {
            // Round ends
            status = "ENDED";
            variant = "expired";
            // Record close price and determine winners
            return {
              ...round,
              status,
              variant,
              timeRemaining: 0,
              closePrice: currentPrice,
            };
          } else if (
            round.status === "UPCOMING" &&
            prevRounds[1].status === "ENDED"
          ) {
            // Next round becomes live when current round ends
            status = "LIVE";
            variant = "live";
            timeRemaining = ROUND_DURATION.LIVE;
            return { ...round, status, variant, timeRemaining };
          }

          return { ...round, timeRemaining, status, variant };
        });

        // Check if we need to add a new upcoming round
        if (updatedRounds.every((round) => round.status !== "UPCOMING")) {
          const lastRound = updatedRounds[updatedRounds.length - 1];
          const newRound = {
            id: lastRound.id + 1,
            variant: "next",
            status: "UPCOMING",
            prizePool: 0.1,
            timeRemaining: ROUND_DURATION.LIVE + ROUND_DURATION.LOCK,
            liveBets: [],
            upBets: 0,
            downBets: 0,
            totalBets: 0,
            startTime: Date.now() + ROUND_DURATION.LIVE * 1000,
            endTime:
              Date.now() +
              (ROUND_DURATION.LIVE * 2 + ROUND_DURATION.LOCK) * 1000,
          };
          updatedRounds.push(newRound);

          // Remove oldest ended round if we have more than 3 rounds
          if (updatedRounds.length > 3) {
            updatedRounds.shift();
          }
        }

        return updatedRounds;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPrice]);

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
    if (!targetRound || targetRound.status !== "LIVE") {
      toast.error("This round is not accepting bets anymore");
      return;
    }

    if (amount <= 0 || amount > userBalance) {
      toast.error("Invalid bet amount");
      return;
    }

    setIsProcessingAction(true);
    toast.loading("Processing your bet...");

    try {
      // In a real implementation, this would create a transaction to the prediction contract
      // For now, we'll simulate it with a delay

      // Simulate blockchain confirmation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
        txHash: `simulated_${Date.now().toString(16)}`,
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

      toast.dismiss();
      toast.success(`${amount} SOL placed on ${direction.toUpperCase()}`);
    } catch (error) {
      console.error("Error placing bet:", error);
      toast.dismiss();
      toast.error("Failed to place bet. Please try again.");
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
    toast.loading("Claiming your rewards...");

    try {
      // In a real implementation, this would create a transaction to claim from the prediction contract
      // For now, we'll simulate it with a delay

      // Simulate blockchain confirmation delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

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

      toast.dismiss();
      toast.success(`Successfully claimed ${claimableRewards.toFixed(4)} SOL`);
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.dismiss();
      toast.error("Failed to claim rewards. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Update user bets when rounds complete
  useEffect(() => {
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
  }, [rounds, userBets, saveUserBets]);

  const formatCardVariant = (round) => {
    return round.variant;
  };

  const getSlidesPerView = () => {
    if (!mounted) return 1;
    if (screenWidth < 640) return 1;
    if (screenWidth < 1024) return 2;
    return 3;
  };

  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-5 md:mt-6 lg:mt-[70px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
        <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-2 md:gap-4">
            <div className="relative">
              <Image
                className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                src={SolanaLogo}
                alt=""
              />
              <div className="glass flex gap-2 sm:gap-[9px] lg:gap-[26px] relative top-0 left-[8px] sm:left-[10px] lg:left-[20px] items-center font-semibold px-3 sm:px-[20px] lg:px-[44px] py-1 sm:py-[6px] lg:py-[15px] rounded-full">
                <p className="text-[10px] sm:text-[12px] lg:text-[20px]">
                  SOL/USDT
                </p>
                <p className="text-[10px] sm:text-[12px]">
                  ${currentPrice.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="glass py-1 sm:py-[6px] lg:py-[15px] px-3 sm:px-[24px] rounded-full w-[90px] sm:w-[104px] lg:w-[210px] relative">
              <p className="flex items-center font-semibold text-[10px] sm:text-[12px] lg:text-[20px] gap-1 sm:gap-[7px]">
                {rounds[1]?.timeRemaining
                  ? Math.floor(rounds[1].timeRemaining / 60)
                  : 0}
                :
                {rounds[1]?.timeRemaining
                  ? (Math.floor(rounds[1].timeRemaining % 60) < 10 ? "0" : "") +
                    Math.floor(rounds[1].timeRemaining % 60)
                  : "00"}
                <span className="text-[6px] sm:text-[8px] lg:text-[12px]">
                  {rounds[1]?.status === "LIVE"
                    ? "Live"
                    : rounds[1]?.status.toLowerCase()}
                </span>
              </p>
              <div className="hidden w-[64px] h-[64px] glass absolute rounded-full right-[24px] top-[-2px] lg:flex items-center justify-center backdrop-blur-2xl">
                <SVG width={40} height={40} iconName="clock" />
              </div>
              <div className="w-[24px] h-[24px] sm:w-[33px] sm:h-[33px] glass absolute rounded-full right-0 top-[-2px] sm:right-[0px] sm:top-[-2px] flex items-center justify-center backdrop-blur-2xl">
                <SVG width={14} height={14} iconName="clock" />
              </div>
            </div>
          </div>

          {/* User Balance and Rewards Bar */}
          {connected && (
            <div className="glass rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-sm opacity-70">Your Balance</p>
                <div className="flex items-center gap-1 font-semibold">
                  <Image
                    className="w-[20px] h-auto object-contain"
                    src={SolanaLogo}
                    alt=""
                  />
                  <span>{userBalance.toFixed(4)} SOL</span>
                </div>
              </div>

              {claimableRewards > 0 && (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm opacity-70">Unclaimed Rewards</p>
                    <div className="flex items-center gap-1 font-semibold text-green-500">
                      <Image
                        className="w-[20px] h-auto object-contain"
                        src={SolanaLogo}
                        alt=""
                      />
                      <span>{claimableRewards.toFixed(4)} SOL</span>
                    </div>
                  </div>
                  <button
                    className="glass bg-green-500 py-2 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                    onClick={handleClaimRewards}
                    disabled={isProcessingAction}
                  >
                    Claim
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Swiper Slider */}
          <div className="relative">
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              effect="coverflow"
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={getSlidesPerView()}
              spaceBetween={mounted && screenWidth < 640 ? 10 : 20}
              coverflowEffect={{
                rotate: mounted && screenWidth < 640 ? 20 : 50,
                stretch: 0,
                depth: mounted && screenWidth < 640 ? 50 : 100,
                modifier: 1,
                slideShadows: true,
              }}
              pagination={{
                clickable: true,
                dynamicBullets: mounted && screenWidth < 640,
                el: ".swiper-pagination",
              }}
              modules={[EffectCoverflow, Pagination]}
              className="w-full px-4 sm:px-0"
            >
              {rounds.map((round, key) => (
                <SwiperSlide
                  key={key}
                  className="flex justify-center items-center"
                >
                  <PredictionCard
                    variant={formatCardVariant(round)}
                    roundId={round.id}
                    roundData={{
                      lockPrice: round.lockPrice,
                      currentPrice: round.currentPrice || currentPrice,
                      closePrice: round.closePrice,
                      prizePool: round.prizePool,
                      timeRemaining: round.timeRemaining,
                      upBets: round.upBets,
                      downBets: round.downBets,
                    }}
                    onPlaceBet={handlePlaceBet}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="swiper-pagination !relative !mt-4" />
          </div>

          {/* Line Chart Component */}
          <div className="mt-10">
            <LineChart
              currentPrice={currentPrice}
              historicalPrices={historicalPrices}
              activeRound={rounds.find(
                (r) => r.status === "LIVE" || r.status === "LOCKED"
              )}
            />
          </div>

          {/* Mobile-only Live Bets */}
          <div className="xl:hidden">
            <MobileLiveBets liveBets={liveBets} />
          </div>

          {/* User Bets History */}
          {connected && userBets.length > 0 && (
            <div className="glass p-4 rounded-xl">
              <h2 className="text-lg font-semibold mb-4">Your Predictions</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm">
                      <th className="pb-2">Round</th>
                      <th className="pb-2">Prediction</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userBets.map((bet) => (
                      <tr key={bet.id} className="border-t border-gray-700">
                        <td className="py-3">#{bet.roundId}</td>
                        <td
                          className={`py-3 ${
                            bet.direction === "up"
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {bet.direction.toUpperCase()}
                        </td>
                        <td className="py-3">{bet.amount} SOL</td>
                        <td className="py-3">
                          <span
                            className={`
                            ${bet.status === "PENDING" ? "text-yellow-500" : ""}
                            ${bet.status === "WON" ? "text-green-500" : ""}
                            ${bet.status === "LOST" ? "text-red-500" : ""}
                          `}
                          >
                            {bet.status}
                          </span>
                        </td>
                        <td className="py-3">
                          {bet.status === "WON"
                            ? `${bet.payout.toFixed(2)} SOL`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Live Bets Sidebar */}
        <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
        <div className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px] cursor-pointer" onClick={() => window.location.href = '/leaderboard'}>
            Leaderboard
          </div>
          <div className="glass px-[30px] py-[16px] rounded-[20px] w-full">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="pb-[24px]">User</th>
                  <th className="pb-[24px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {liveBets.map((bet, key) => (
                  <tr key={key} className="font-semibold text-[15px]">
                    <td className="py-3">
                      <div className="flex gap-[6px] items-center">
                        <SVG width={29} height={29} iconName="avatar" />
                        {bet.user}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Image
                          className="w-[30px] h-auto object-contain"
                          src={SolanaLogo}
                          alt=""
                        />
                        {bet.amount} SOL
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

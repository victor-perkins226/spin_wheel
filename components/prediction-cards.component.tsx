/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { MobileLiveBets } from "./MobileBets";
import LiveBets from "./LiveBets";
import { useRoundManager } from "@/hooks/roundManager";
import { Round } from "@/types/round";
import { useSolPredictor } from "@/hooks/useBuyClaim";
import { BetsHistory } from "./BetsHistory";
import LineChart from "./LineChart";
import { useLivePrice } from "@/lib/price-utils";
import { useProgram } from "@/hooks/useProgram";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { DotLoader } from "react-spinners";

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<any>(null);
  const { publicKey, connected, sendTransaction } = useWallet();
  const connectionRef = useRef<Connection | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [liveRoundPrice, setLiveRoundPrice] = useState(50.5);
  const [claimableRewards, setClaimableRewards] = useState(0);
  const {
    handlePlaceBet,
    handleClaimPayout,
    claimableBets,
    userBets,
    fetchUserBets,
  } = useSolPredictor();
  const claimableAmountRef = useRef<number>(0); // Store claimableAmount in useRef
  const { program } = useProgram();
  const initialSlideJumped = useRef(false);

  const { theme } = useTheme();
  const {
    config,
    currentRound,
    treasuryFee,
    previousRounds,
    totalPreviousRounds,
    isLoading, // <-- Used from useRoundManager
    isPaused,
    getRoundOutcome,
    fetchMoreRounds,
    timeLeft,
    isLocked,
    getRoundStatus,
    getTimerDisplay,
  } = useRoundManager(5, 0);

  const [isFetchingRounds, setIsFetchingRounds] = useState(false);
  const previousComputedRoundsRef = useRef<Round[]>([]); // Ref to store last valid computed rounds

  // Update claimableAmountRef when claimableBets changes
  useEffect(() => {
    const newClaimableAmount = claimableBets.reduce(
      (sum, bet) => sum + bet.payout,
      0
    );
    claimableAmountRef.current = newClaimableAmount;
    console.log("Updated claimableAmount:", claimableAmountRef.current);
  }, [claimableBets]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserBets();
    }
  }, [connected, publicKey, fetchUserBets]);
  const { price: livePrice, isLoading: priceLoading, error: priceError } = useLivePrice();

  // Fetch live price periodically
  useEffect(() => {
    const updateLivePrice = async () => {
      if (livePrice !== undefined) {
      console.log("Live price fetched:", livePrice);
      setLiveRoundPrice(livePrice!);
      }
    };

    updateLivePrice(); // Initial fetch
    // const interval = setInterval(updateLivePrice, 10000); // Update every 10 seconds

    // return () => clearInterval(interval); // Cleanup on unmount
  }, [livePrice]);

  useEffect(() => {
    connectionRef.current = new Connection(
      "https://lb.drpc.org/ogrpc?network=solana-devnet&dkey=AqnRwY5nD0C_uEv_hPfBwlLj0fFzMcQR8JKdzoXPVSjK",
      {
        commitment: "finalized",
        wsEndpoint: undefined,
      }
    );

    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);
    setMounted(true);

    return () => {
      window.removeEventListener("resize", updateScreenWidth);
      if (swiperRef.current?.destroy) {
        swiperRef.current.destroy(true, true);
      }
    };
  }, []);

  useEffect(() => {
    if (!connected || !publicKey || !connectionRef.current) return;

    const fetchBalance = async () => {
      try {
        const balance = await connectionRef.current!.getBalance(publicKey);
        setUserBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };

    fetchBalance();
  }, [connected, publicKey, currentRound?.number]);

  const handleBet = async (
    direction: "up" | "down",
    amount: number,
    roundId: number
  ) => {
    if (!connected || !publicKey || !connectionRef.current) {
      toast.error("Please connect your wallet to place a bet");
      return;
    }

    try {
      await handlePlaceBet(roundId, direction === "up", amount);
      toast.success(
        `Bet placed: ${amount} SOL ${direction} on round ${roundId}`
      );
    } catch (error) {
      console.error("Failed to place bet:", error);
      toast.error("Failed to place bet");
    }
  };

  const handleClaimRewards = useCallback(async () => {
    if (!connected || !publicKey || !connectionRef.current || !program) {
      toast.error("Please connect your wallet to claim rewards");
      return;
    }

    if (claimableBets.length === 0) {
      toast.error("No claimable bets available");
      return;
    }

    try {
      // Collect instructions for all claimable bets
      const instructions = await Promise.all(
        claimableBets.map((bet: { roundNumber: number }) =>
          handleClaimPayout(bet.roundNumber)
        )
      );

      // Create a new transaction
      const transaction = new Transaction();
      instructions.forEach((instruction) => transaction.add(instruction));

      // Get recent blockhash
      const { blockhash } = await connectionRef.current.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send and confirm transaction
      const signature = await sendTransaction(
        transaction,
        connectionRef.current,
        {
          skipPreflight: false, // Run preflight checks
        }
      );
      await connectionRef.current.confirmTransaction(signature, "confirmed");

      // Refresh bets after claiming
      await fetchUserBets();

      // Reset claimable rewards
      setClaimableRewards(0);

      console.log(`Batched payout claimed successfully: ${signature}`);
      toast.success(`Successfully claimed rewards for ${claimableBets.length} rounds!`);
    } catch (error: any) {
      console.error("Failed to claim rewards:", error);
      let errorMessage = "Failed to claim rewards. Please try again.";
      if (error.message.includes("6012")) {
        errorMessage = "Contract is paused.";
      } else if (error.message.includes("6006")) {
        errorMessage = "Payout already claimed.";
      } else if (error.message.includes("6003")) {
        errorMessage = "Round has not ended yet.";
      } else if (error.message.includes("6004")) {
        errorMessage = "Round has not closed yet.";
      } else if (error.message.includes("6015")) {
        errorMessage = "No rewards available for this round.";
      } else if (error.message.includes("6007")) {
        errorMessage = "Invalid round number.";
      } else if (error.message.includes("6010")) {
        errorMessage = "Insufficient funds in escrow.";
      } else if (error.message.includes("Signature request denied")) {
        errorMessage = "Transaction was not signed.";
      }
      toast.error(errorMessage);
    }
  }, [
    connected,
    publicKey,
    program,
    claimableBets,
    sendTransaction,
    fetchUserBets,
    handleClaimPayout,
  ]);

  const getSlidesPerView = () => {
    if (!mounted) return 1;
    if (screenWidth < 640) return 1;
    if (screenWidth < 1024) return 2;
    return 3;
  };

  // Create dummy later rounds
  const createDummyLaterRound = (
    baseRound: Round,
    offsetNumber: number
  ): Round => {
    const roundNumber = Number(baseRound.number) + offsetNumber;
    const baseStartTime =
      typeof baseRound.closeTime === "number"
        ? baseRound.closeTime + offsetNumber * 240
        : Math.floor(Date.now() / 1000) + offsetNumber * 240;

    return {
      number: roundNumber.toString(),
      startTime: baseStartTime,
      lockTime: baseStartTime + 120,
      closeTime: baseStartTime + 240,
      totalAmount: 0,
      totalBullAmount: 0,
      totalBearAmount: 0,
      isActive: false,
      status: "later",
    } as unknown as Round;
  };

  // Update your card rendering logic
  const formatCardVariant = (round: Round, current: number) => {
    const status = getRoundStatus(round); // e.g. STARTED | LOCKED | CALCULATING | ENDED
    const n = Number(round.number);

    // 1.  Round *you can bet on* → “next”
    if (n === current) return "next";

    // 2.  Previous round that is still being resolved → “live” / ”calculating”
    if (n === current - 1) {
      return "live";
    }

    // 3.  Future rounds (current+1, current+2 …)
    if (n > current) return "later";

    // 4.  Anything older
    return "expired";
  };
  const handleSlideChange = () => {
    if (!swiperRef.current) return;
    const swiper = swiperRef.current;
  };

  // Add a more robust version of safeFetchMoreRounds that handles API errors
  const safeFetchMoreRounds = useCallback(async () => {
    if (isFetchingRounds) return; // debounce
    try {
      setIsFetchingRounds(true); // show loader
      await fetchMoreRounds?.(); // same hook you already call
    } catch (error: any) {
      // Handle axios errors
      if (error?.name === "AxiosError") {
        console.error("API error when fetching rounds:", error.message);
        // Don't crash the app, just show a toast message
        toast.error(
          "Server error when fetching new rounds. Please try again later."
        );
      } else {
        console.error("Error fetching rounds:", error);
      }
      // Give the server a moment to recover before trying again
      setTimeout(() => {
        setIsFetchingRounds(false);
      }, 10000); // Wait 10 seconds before allowing another attempt
      return;
    }
    setIsFetchingRounds(false); // hide loader
  }, [fetchMoreRounds, isFetchingRounds]);

  useEffect(() => {
    if (timeLeft === 0) {
      initialSlideJumped.current = false;
      safeFetchMoreRounds(); // Use the guarded version
    }
  }, [timeLeft, safeFetchMoreRounds]);

  const currentRoundNumber =
    Number(config?.currentRound) ?? Number(currentRound?.number) ?? null;

  if (currentRoundNumber == null) return <DotLoader />;
  const nextRoundNumber = currentRoundNumber + 1;
  const nextRound =
    previousRounds.find((r: Round) => Number(r.number) === nextRoundNumber) ??
    ({
      number: nextRoundNumber.toString(),
      startTime:
        typeof currentRound?.closeTime === "number"
          ? currentRound.closeTime + 1
          : Math.floor(Date.now() / 1000) + 1,
      lockTime:
        (typeof currentRound?.closeTime === "number"
          ? currentRound.closeTime
          : Math.floor(Date.now() / 1000)) + 120,
      closeTime:
        (typeof currentRound?.closeTime === "number"
          ? currentRound.closeTime
          : Math.floor(Date.now() / 1000)) + 240,
      totalAmount: 0,
      totalBullAmount: 0,
      totalBearAmount: 0,
      isActive: false,
      status: "started",
    } as unknown as Round);

  const rounds = [
    ...(currentRound ? [currentRound] : []),
    nextRound,
    ...previousRounds.filter(
      (r: Round) =>
        Number(r.number) > 0 && Number(r.number) <= currentRoundNumber - 1
    ),
  ];

  // Deduplicate rounds
  const roundMap = new Map<number, Round>();
  rounds.forEach((round) => {
    const roundNumber = Number(round.number);
    if (!isNaN(roundNumber)) {
      roundMap.set(roundNumber, round);
    } else {
      console.warn(`Skipping round with invalid number:`, round);
    }
  });

  // Get unique rounds and sort them based on the desired order
  const uniqueRounds = Array.from(roundMap.values());

  const sortedRounds = useMemo(() => {
    try {
      // build your unique list
      const list = Array.from(roundMap.values());
      // clone+sort
      return [...list].sort((a, b) => Number(a.number) - Number(b.number));
    } catch (error) {
      console.error("Error sorting rounds:", error);
      // Return empty array as fallback to prevent crashes
      return [];
    }
  }, [roundMap]);

  const liveRound = previousRounds.find(
    (r) => Number(r.number) === currentRoundNumber - 1
  );

  useEffect(() => {
    if (!liveRound) return;
    const id = setInterval(() => {
      if (Date.now() / 1000 > liveRound.closeTime) safeFetchMoreRounds();
    }, 5_000); // poll every 5 s

    return () => clearInterval(id);
  }, [liveRound, safeFetchMoreRounds]);

  // Renamed original displayRounds to computedDisplayRounds
  const computedDisplayRounds = useMemo(() => {
    try {
      const list = [...sortedRounds];
      const currentTime = Math.floor(Date.now() / 1000);

      // Find live round (the round before current)
      const liveRoundIndex = list.findIndex(
        (r) => formatCardVariant(r, currentRoundNumber) === "live"
      );

      // If no live round found, return empty array
      // if (liveRoundIndex === -1) return [];

      const liveRound = list[liveRoundIndex];

      // Find next round (current round in our context)
      const nextRoundIndex = list.findIndex(
        (r) => formatCardVariant(r, currentRoundNumber) === "next"
      );
      const nextRound = nextRoundIndex !== -1 ? list[nextRoundIndex] : null;

      // Get expired rounds (up to 3)
      const expiredRounds = list
        .filter((r) => formatCardVariant(r, currentRoundNumber) === "expired")
        .sort((a, b) => Number(b.number) - Number(a.number)) // Sort in descending order
        .slice(0, 3); // Take the 3 most recent expired rounds

      // Get real later rounds, but only if they're actual future rounds
      const laterRounds = list
        .filter((r) => {
          const variant = formatCardVariant(r, currentRoundNumber);
          // Only include later rounds where closeTime is in the future
          return (
            variant === "later" &&
            typeof r.closeTime === "number" &&
            r.closeTime > currentTime
          );
        })
        .slice(0, 1); // Take only 1 real later round

      // Add only one dummy later round if we have a next round to base it on
      // and only if we don't already have a real later round
      const dummyLaterRounds: Round[] = [];
      if (nextRound && laterRounds.length === 0) {
        dummyLaterRounds.push(createDummyLaterRound(nextRound, 1));
      }

      // Create the final array in the correct order
      // We'll manage the order explicitly rather than sorting at the end
      const result = [
        ...expiredRounds.sort((a, b) => Number(a.number) - Number(b.number)), // Expired rounds come first, sorted by round number
        liveRound, // Then the live round
        ...(nextRound ? [nextRound] : []), // Then the next round (if any)
        ...laterRounds, // Then any real later rounds
        ...dummyLaterRounds, // Finally any dummy later rounds
      ];

      return result.filter(Boolean); // Ensure no null/undefined items if liveRound or nextRound is null
    } catch (error) {
      console.error("Error filtering rounds to display:", error);
      return [];
    }
  }, [
    sortedRounds,
    currentRoundNumber,
    createDummyLaterRound,
    formatCardVariant,
  ]); // Added dependencies from createDummyLaterRound and formatCardVariant

  // Update the ref with the latest non-empty computed rounds
  useEffect(() => {
    if (computedDisplayRounds.length > 0) {
      previousComputedRoundsRef.current = computedDisplayRounds;
    }
  }, [computedDisplayRounds]);

  // Determine if the system is in a state of loading/preparing the next round
  const isSystemLoadingNextRound =
    isLoading || (isLocked && currentRound?.number !== config?.currentRound);

  // Determine the final set of rounds to display in the Swiper
  const finalDisplayRoundsForSwiper = useMemo(() => {
    // Always show computed rounds if available, regardless of loading state
    if (computedDisplayRounds.length > 0) {
      return computedDisplayRounds;
    }

    // If no computed rounds but we have previous rounds cached, use them
    if (previousComputedRoundsRef.current.length > 0) {
      return previousComputedRoundsRef.current;
    }

    // Fallback: create minimal dummy rounds if no data is available
    const fallbackCurrentTime = Math.floor(Date.now() / 1000);
    const fallbackRounds: Round[] = [];

    for (let i = 0; i < 3; i++) {
      const roundNumber = currentRoundNumber - 1 + i;
      const baseTime = fallbackCurrentTime + i * 240;

      fallbackRounds.push({
        number: roundNumber.toString(),
        startTime: baseTime - 240,
        lockTime: baseTime - 120,
        closeTime: baseTime,
        totalAmount: 0,
        totalBullAmount: 0,
        totalBearAmount: 0,
        isActive: i === 1, // Make the middle one active
        status: i === 0 ? "expired" : i === 1 ? "next" : "later",
      } as unknown as Round);
    }

    return fallbackRounds;
  }, [computedDisplayRounds, currentRoundNumber]);

  // Add error handling for liveIndex calculation
  const liveIndex = useMemo(() => {
    try {
      // Use finalDisplayRoundsForSwiper for calculating liveIndex
      return finalDisplayRoundsForSwiper.findIndex(
        (r) => formatCardVariant(r, currentRoundNumber) === "live"
      );
    } catch (error) {
      console.error("Error finding live index:", error);
      return -1; // Return -1 if there's an error
    }
  }, [finalDisplayRoundsForSwiper, currentRoundNumber, formatCardVariant]); // Added formatCardVariant dependency

  console.log(
    "Final display rounds for Swiper:", finalDisplayRoundsForSwiper)
  useEffect(() => {
    const swiper = swiperRef.current;
    if (swiper && liveIndex >= 0 && !initialSlideJumped.current) {
      try {
        swiper.slideTo(liveIndex, 0);
        initialSlideJumped.current = true;
      } catch (error) {
        console.error("Error sliding to live index:", error);
      }
    }

    if (timeLeft === 0) {
      initialSlideJumped.current = false;
      // Protect with try/catch to prevent crashes
      try {
        safeFetchMoreRounds();
      } catch (error) {
        console.error("Error refreshing rounds:", error);
      }
    }
  }, [liveIndex, timeLeft, safeFetchMoreRounds]);

  // Improve visibility change handler with better API error handling
  useEffect(() => {
    let isRefreshing = false;

    const handleVisibility = async () => {
      if (document.visibilityState === "visible" && !isRefreshing) {
        isRefreshing = true;

        try {
          // Run these in parallel but handle errors independently
          const tasks = [];

          // fetchMoreRounds is always defined from the hook
          tasks.push(
            safeFetchMoreRounds().catch((err) => {
              console.error(
                "Error refreshing rounds on visibility change:",
                err
              );
            })
          );

          if (fetchUserBets) {
            tasks.push(
              fetchUserBets().catch((err) => {
                console.error(
                  "Error fetching user bets on visibility change:",
                  err
                );
                if (
                  err?.name === "AxiosError" &&
                  err?.response?.status === 500
                ) {
                  console.log(
                    "Server error when fetching user bets, will retry later"
                  );
                }
              })
            );
          }

          // Use Promise.allSettled to ensure all promises complete regardless of success/failure
          await Promise.allSettled(tasks);
        } catch (error) {
          console.error("Error during visibility change refresh:", error);
        } finally {
          // Add a small delay before allowing refreshes again to prevent hammering the server
          setTimeout(() => {
            isRefreshing = false;
          }, 2000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchMoreRounds, fetchUserBets, safeFetchMoreRounds]);

  const formatTimeLeft = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "Locked";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-5 md:mt-6 lg:mt-[70px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
        <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
          <div className="flex justify-between items-center flex-wrap gap-4 md:gap-4">
            <div className="relative">
              <Image
                className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                src="/assets/solana_logo.png"
                alt="Solana"
                width={64}
                height={64}
              />
              <div className="glass flex gap-2 sm:gap-[9px] lg:gap-[26px] relative top-0 left-[8px] sm:left-[10px] lg:left:[20px] items-center font-semibold px-3 sm:px-[20px] lg:px-[44px] py-1 sm:py-[6px] lg:py-[15px] rounded-full">
                <p className="text-[10px] pl-4 sm:text-[12px] lg:text-[20px]">
                  SOL/USDT
                </p>
                <p className="text-[10px] sm:text-[12px]">
                  ${liveRoundPrice.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="relative flex items-center justify-center w-[60px] sm:w-[80px] lg:w-[120px] h-[60px] sm:h-[80px] lg:h-[120px]">
              {/* Circular progress background */}
              <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={theme === "dark" ? "#374151" : "#E5E7EB"} // grey-700 for dark, grey-200 for light
                  strokeWidth="5"
                />

                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={theme === "dark" ? "#6B7280" : "#9CA3AF"} // grey-500 for dark, grey-400 for light
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="283" // 2πr ≈ 283 (for r=45)
                  strokeDashoffset={283 - 283 * (1 - (timeLeft ?? 0) / 120)} // Adjusted calculation with null check
                  transform="rotate(-90 50 50)"
                />

                {/* 12 hour markers */}
                {Array.from({ length: 20 }).map((_, i) => {
                  const angle = 15 + i * 18; // Starts at 15°, 18° increments (covers 15°-345°)
                  if (angle < 165 || angle > 195) {
                    // Skip small bottom portion (165°-195°)
                    return (
                      <line
                        key={i}
                        x1="50"
                        y1="8"
                        x2="50"
                        y2="12"
                        stroke={theme === "dark" ? "#4B5563" : "#6B7280"} // grey-600 for dark, grey-500 for light
                        strokeWidth="1.5"
                        transform={`rotate(${angle} 50 50)`}
                      />
                    );
                  }
                  return null;
                })}
              </svg>

              {/* Time display in center */}
              <div className="absolute flex flex-col items-center justify-center z-10">
                <span
                  className={`font-semibold text-[12px] sm:text-[16px] lg:text-[24px] ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatTimeLeft(timeLeft)}
                </span>
                <span
                  className={`text-[8px] sm:text-[10px] lg:text-[12px] ${
                    theme === "dark" ? "text-[#D1D5DB]" : "text-gray-500"
                  }`}
                >
                  2m
                </span>
              </div>
            </div>
          </div>

          {connected && (
            <div className="glass rounded-xl p-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-sm opacity-70">Your Balance</p>
                <div className="flex items-center gap-1 font-semibold">
                  <Image
                    className="w-[20px] h-auto object-contain"
                    src="/assets/solana_logo.png"
                    alt="Solana"
                    width={20}
                    height={20}
                  />
                  <span>{userBalance.toFixed(4)} SOL</span>
                </div>
              </div>
              {claimableAmountRef.current > 0 && (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm opacity-70">Unclaimed Rewards</p>
                    <div className="flex items-center gap-1 font-semibold text-green-500">
                      <Image
                        className="w-[20px] h-auto object-contain"
                        src="/assets/solana_logo.png"
                        alt="Solana"
                        width={20}
                        height={20}
                      />
                      <span>{claimableAmountRef.current.toFixed(4)} SOL</span>
                    </div>
                  </div>
                  <button
                    className="glass bg-green-500 py-2 px-4  cursor-pointer rounded-lg font-semibold hover:bg-green-600 transition-colors"
                    onClick={handleClaimRewards}
                    disabled={claimableAmountRef.current === 0}
                  >
                    Claim
                  </button>
                </div>
              )}
            </div>
          )}

          {!connected && (
            <div className="glass rounded-xl p-4 flex justify-center items-center">
              <p className="text-sm opacity-70">
                Connect your wallet to place bets and view your balance
              </p>
            </div>
          )}

          {!connected ? (
            // Show wallet connection prompt instead of cards when not connected
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
              <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 max-w-md mx-auto text-center">
                <Image
                  className="w-16 h-16 object-contain opacity-50"
                  src="/assets/solana_logo.png"
                  alt="Solana"
                  width={64}
                  height={64}
                />
                <h3 className="text-xl font-semibold">Connect Your Wallet</h3>
                <p className="text-sm opacity-70">
                  To start predicting SOL price movements and placing bets, please connect your Solana wallet.
                </p>
                <div className="flex flex-col gap-2 text-xs opacity-60">
                  <p>• View live prediction rounds</p>
                  <p>• Place UP/DOWN bets</p>
                  <p>• Track your betting history</p>
                  <p>• Claim your winnings</p>
                </div>
              </div>
            </div>
          ) : (
            // Show cards only when wallet is connected
            <div className="relative">
              <Swiper
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                }}
                onSlideChange={handleSlideChange}
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
                modules={[Pagination, EffectCoverflow]}
                className="w-full px-4 sm:px-0"
              >
                {finalDisplayRoundsForSwiper.map((round, index) => {
                  if (!round || !round.number) {
                    // Add a check for valid round object
                    console.warn(
                      "Skipping invalid round object in Swiper map:",
                      round
                    );
                    return null;
                  }
                  const roundNumber = Number(round.number);
                  const startTimeMs =
                    typeof round.startTime === "number" && !isNaN(round.startTime)
                      ? round.startTime * 1000
                      : round.startTime instanceof Date
                      ? round.startTime.getTime()
                      : 0;
                  const lockTime =
                    round.lockTime instanceof Date
                      ? round.lockTime.getTime() / 1000
                      : typeof round.lockTime === "string" &&
                        !isNaN(Number(round.lockTime))
                      ? Number(round.lockTime)
                      : startTimeMs / 1000 + 120;
                  const closeTime =
                    round.closeTime instanceof Date
                      ? round.closeTime.getTime() / 1000
                      : typeof round.closeTime === "string" &&
                        !isNaN(Number(round.closeTime))
                      ? Number(round.closeTime)
                      : lockTime + 120;

                  // Get the variant for this card
                  const cardVariant = formatCardVariant(
                    round,
                    currentRoundNumber
                  );

                  return (
                    <SwiperSlide
                      key={round.number} // Ensure key is stable and unique
                      className="flex justify-center items-center"
                    >
                      <PredictionCard
                        variant={cardVariant}
                        roundId={Number(round.number)}
                        roundData={{
                          lockPrice: round.lockPrice! / 1e8,
                          closePrice: round.endPrice
                            ? round.endPrice / 1e8
                            : liveRoundPrice,
                          currentPrice:
                            liveRoundPrice || (round.lockPrice || 50 * 1e8) / 1e8,
                          prizePool: (round.totalAmount || 0) / LAMPORTS_PER_SOL,
                          upBets: (round.totalBullAmount || 0) / LAMPORTS_PER_SOL,
                          downBets:
                            (round.totalBearAmount || 0) / LAMPORTS_PER_SOL,
                          timeRemaining: Math.max(
                            0,
                            closeTime - Date.now() / 1000
                          ),
                          lockTimeRemaining:
                            timeLeft !== null &&
                            roundNumber === Number(config?.currentRound)
                              ? timeLeft
                              : Math.max(0, lockTime - Date.now() / 1000),
                          lockTime:
                            timeLeft !== null &&
                            roundNumber === Number(config?.currentRound)
                              ? Date.now() / 1000 + timeLeft
                              : lockTime,
                          closeTime,
                          isActive: round.isActive ? true : false,
                          treasuryFee: config ? treasuryFee! : 5,
                        }}
                        onPlaceBet={handleBet}
                        currentRoundId={Number(config?.currentRound)}
                        bufferTimeInSeconds={0}
                        liveRoundPrice={liveRoundPrice}
                        userBets={connected ? userBets : []} // Only show user bets if connected
                        isLocked={isLocked}
                        timeLeft={timeLeft}
                        // Pass wallet connection status to the card
                        isWalletConnected={connected}
                      />
                    </SwiperSlide>
                  );
                })}
              </Swiper>
              <div className="swiper-pagination !relative !mt-4" />
            </div>
          )}

          <div className="xl:hidden">
            <MobileLiveBets liveBets={[]} />
          </div>

          {/* Line Chart Component - always visible */}
          <div className="mt-10">
            <LineChart />
          </div>

          {/* Only show bet history if wallet is connected and has bets */}
          {connected && userBets.length > 0 && (
            <BetsHistory userBets={userBets} />
          )}
        </div>

        <LiveBets currentRound={Number(currentRound?.number) ?? null} />
      </div>
    </div>
  );
}

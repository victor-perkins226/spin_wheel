/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
import { fetchLivePrice } from "@/lib/price-utils";
import { useProgram } from "@/hooks/useProgram";
import toast from "react-hot-toast";

// Extend the Round type to include variant property
interface ExtendedRound extends Round {
  variant?: string;
}

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<any>(null);
  const { publicKey, connected, sendTransaction } = useWallet();
  const connectionRef = useRef<Connection | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [liveRoundPrice, setLiveRoundPrice] = useState(50.5);
  const [claimableRewards, setClaimableRewards] = useState(0);
  const [calculatingRound, setCalculatingRound] = useState<number | null>(null);
  const [calculatingUntil, setCalculatingUntil] = useState<number>(0);
  const [lastLiveRounds, setLastLiveRounds] = useState<Set<number>>(new Set());
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
  const {
    config,
    currentRound,
    treasuryFee,
    previousRounds,
    totalPreviousRounds,
    isLoading,
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

  // Fetch live price periodically
  useEffect(() => {
    const updateLivePrice = async () => {
      const price = await fetchLivePrice();
      setLiveRoundPrice(price!);
    };

    updateLivePrice(); // Initial fetch
    const interval = setInterval(updateLivePrice, 10000); // Update every 10 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

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

  // Add effect to detect when live rounds end and trigger calculating state

  // Clear calculating state after 10 seconds
  useEffect(() => {
    const now = Date.now() / 1000;
    if (calculatingRound !== null && now >= calculatingUntil) {
      console.log(`Calculating period ended for round ${calculatingRound}`);
      setCalculatingRound(null);
      setCalculatingUntil(0);
    }
  }, [calculatingRound, calculatingUntil, timeLeft]); // Include timeLeft to trigger regular updates

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
      toast.success(`Bet placed: ${amount} SOL ${direction} on round ${roundId}`);
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
      const instructions = await Promise.all(
        claimableBets.map((bet: { roundNumber: number }) =>
          handleClaimPayout(bet.roundNumber)
        )
      );

      const transaction = new Transaction();
      instructions.forEach((instruction) => transaction.add(instruction));

      const { blockhash } = await connectionRef.current.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(
        transaction,
        connectionRef.current,
        {
          skipPreflight: false,
        }
      );
      await connectionRef.current.confirmTransaction(signature, "confirmed");

      await fetchUserBets();

      setClaimableRewards(0);

      console.log(`Batched payout claimed successfully: ${signature}`);
      alert(`Successfully claimed rewards for ${claimableBets.length} rounds!`);
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
      alert(errorMessage);
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

  const createDummyLaterRound = useCallback(
    (roundNumber: number, timeOffset: number, variant: string = "later"): Round => {
      const baseStartTime = Math.floor(Date.now() / 1000) + timeOffset * 240;

      return {
        number: roundNumber,
        startTime: baseStartTime,
        lockTime: baseStartTime + 120,
        closeTime: baseStartTime + 240,
        totalAmount: 0,
        totalBullAmount: 0,
        totalBearAmount: 0,
        isActive: false,
        status: "started",
        lockPrice: null,
        endPrice: null,
        rewardBaseCalAmount: 0,
        rewardAmount: 0,
      } as Round;
    },
    []
  );

  const formatCardVariant = useCallback(
    (round: Round, currentRoundNumber: number): string => {
      if (!currentRoundNumber) return "expired";

      const roundNum = Number(round.number);
      const currentNum = Number(currentRoundNumber);
      const now = Date.now() / 1000;

      // Check if this round should show calculating state
      if (calculatingRound === roundNum && now < calculatingUntil) {
        return "calculating";
      }

      if (roundNum === currentNum || roundNum === currentNum - 1) {
        console.log(`Round ${roundNum} times:`, {
          lockTime: Number(round.lockTime),
          closeTime: Number(round.closeTime),
          currentTime: now,
          isActive: round.isActive,
          timeLeft: now < Number(round.closeTime) ? Number(round.closeTime) - now : 0,
        });
      }

      if (roundNum === currentNum) {
        const lockTime = Number(round.lockTime);
        const closeTime = Number(round.closeTime);

        if (now >= lockTime && now < closeTime && round.isActive) {
          console.log(`Round ${roundNum} is LIVE (current round in live phase)`);
          return "live";
        }

        if (now < lockTime && round.isActive) {
          return "next";
        }

        return "expired";
      } else if (roundNum === currentNum - 1) {
        const lockTime = Number(round.lockTime);
        const closeTime = Number(round.closeTime);

        if (now >= lockTime && now < closeTime && round.isActive) {
          console.log(`Round ${roundNum} is LIVE (previous round still in live phase)`);
          return "live";
        }

        return "expired";
      } else if (roundNum > currentNum) {
        return "later";
      }

      return "expired";
    },
    [calculatingRound, calculatingUntil]
  );

  const currentRoundNumber = Number(currentRound?.number) || 0;
  const formatTimeLeft = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "Locked";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const nextRound =
    previousRounds.find((r: Round) => Number(r.number) === currentRoundNumber + 1) ??
    ({
      number: currentRoundNumber + 1,
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
      lockPrice: null,
      endPrice: null,
      rewardBaseCalAmount: 0,
      rewardAmount: 0,
    } as Round);

  const computedDisplayRounds = useMemo((): ExtendedRound[] => {
    try {
      const list = [...previousRounds];
      const now = Date.now() / 1000;

      let liveRound: Round | null = null;
      let nextRound: Round | null = null;

      const currentRoundData = list.find((r) => Number(r.number) === currentRoundNumber);
      if (currentRoundData) {
        const lockTime = Number(currentRoundData.lockTime);
        const closeTime = Number(currentRoundData.closeTime);

        if (now >= lockTime && now < closeTime && currentRoundData.isActive) {
          liveRound = currentRoundData;
          console.log("Found LIVE round (current):", currentRoundData.number);
        } else if (now < lockTime && currentRoundData.isActive) {
          nextRound = currentRoundData;
          console.log("Found NEXT round (current):", currentRoundData.number);
        }
      }

      if (!liveRound) {
        const previousRoundData = list.find((r) => Number(r.number) === currentRoundNumber - 1);
        if (previousRoundData) {
          const lockTime = Number(previousRoundData.lockTime);
          const closeTime = Number(previousRoundData.closeTime);

          if (now >= lockTime && now < closeTime && previousRoundData.isActive) {
            liveRound = previousRoundData;
            console.log("Found LIVE round (previous):", previousRoundData.number);
          }
        }
      }

      if (!nextRound) {
        const nextRoundData = list.find((r) => {
          const roundNum = Number(r.number);
          const lockTime = Number(r.lockTime);
          return roundNum >= currentRoundNumber && now < lockTime && r.isActive;
        });

        if (nextRoundData) {
          nextRound = nextRoundData;
          console.log("Found NEXT round:", nextRoundData.number);
        }
      }

      if (!liveRound) {
        if (currentRoundData && now < Number(currentRoundData.closeTime)) {
          liveRound = { ...currentRoundData, isActive: true };
          console.log("Forcing current round to be LIVE:", liveRound.number);
        } else {
          liveRound = createDummyLaterRound(currentRoundNumber, 0, "live");
          liveRound.isActive = true;
          console.log("Created dummy LIVE round:", liveRound.number);
        }
      }

      if (!nextRound) {
        const nextRoundNumber = liveRound ? Number(liveRound.number) + 1 : currentRoundNumber + 1;
        nextRound = createDummyLaterRound(nextRoundNumber, 1, "next");
        nextRound.isActive = true;
        console.log("Created dummy NEXT round:", nextRound.number);
      }

      const expiredRounds = list
        .filter((r) => {
          const roundNum = Number(r.number);
          if (liveRound && roundNum === Number(liveRound.number)) return false;
          if (nextRound && roundNum === Number(nextRound.number)) return false;

          const variant = formatCardVariant(r, currentRoundNumber);
          const closeTime = Number(r.closeTime);

          return variant === "expired" || roundNum < currentRoundNumber || now >= closeTime;
        })
        .sort((a, b) => Number(b.number) - Number(a.number))
        .slice(0, 3);

      const laterRounds = list
        .filter((r) => {
          const roundNum = Number(r.number);
          return roundNum > Number(nextRound!.number);
        })
        .slice(0, 2);

      while (laterRounds.length < 2) {
        const roundNum =
          laterRounds.length > 0
            ? Math.max(...laterRounds.map((r) => Number(r.number))) + 1
            : Number(nextRound!.number) + 1;

        laterRounds.push(createDummyLaterRound(roundNum, laterRounds.length + 2, "later"));
      }

      const result: ExtendedRound[] = [
        ...expiredRounds.map((round) => ({ ...round, variant: "expired" })),
        { ...liveRound!, variant: "live" },
        { ...nextRound!, variant: "next" },
        ...laterRounds.map((round, index) => ({
          ...round,
          variant: index === 0 ? "later" : "later_next",
        })),
      ].filter(Boolean);

      console.log("Round display info (GUARANTEED LIVE+NEXT):", {
        currentRoundNumber,
        liveRoundNumber: liveRound?.number,
        nextRoundNumber: nextRound?.number,
        expiredCount: expiredRounds.length,
        laterCount: laterRounds.length,
        totalDisplayed: result.length,
        hasLive: result.some((r) => r.variant === "live"),
        hasNext: result.some((r) => r.variant === "next"),
        currentTime: now,
        expiredRoundNumbers: expiredRounds.map((r) => r.number),
      });

      return result;
    } catch (error) {
      console.error("Error processing display rounds:", error);

      const emergencyLive = createDummyLaterRound(currentRoundNumber, 0, "live");
      emergencyLive.isActive = true;
      const emergencyNext = createDummyLaterRound(currentRoundNumber + 1, 1, "next");
      emergencyNext.isActive = true;

      return [
        { ...emergencyLive, variant: "live" },
        { ...emergencyNext, variant: "next" },
      ];
    }
  }, [previousRounds, currentRoundNumber, createDummyLaterRound, formatCardVariant]);

  useEffect(() => {
    if (computedDisplayRounds.length > 0) {
      previousComputedRoundsRef.current = computedDisplayRounds;
    }
  }, [computedDisplayRounds]);

  const finalDisplayRoundsForSwiper = useMemo((): ExtendedRound[] => {
    if (computedDisplayRounds.length > 0) {
      return computedDisplayRounds;
    }

    if (previousComputedRoundsRef.current.length > 0) {
      return previousComputedRoundsRef.current;
    }

    const fallbackCurrentTime = Math.floor(Date.now() / 1000);
    const fallbackRounds: ExtendedRound[] = [];

    for (let i = 0; i < 3; i++) {
      const roundNumber = currentRoundNumber - 1 + i;
      const baseTime = fallbackCurrentTime + i * 240;

      fallbackRounds.push({
        number: roundNumber,
        startTime: baseTime - 240,
        lockTime: baseTime - 120,
        closeTime: baseTime,
        totalAmount: 0,
        totalBullAmount: 0,
        totalBearAmount: 0,
        isActive: i === 1,
        status: "started",
        lockPrice: null,
        endPrice: null,
        rewardBaseCalAmount: 0,
        rewardAmount: 0,
        variant: i === 0 ? "expired" : i === 1 ? "next" : "later",
      } as ExtendedRound);
    }

    return fallbackRounds;
  }, [computedDisplayRounds, currentRoundNumber]);

  useEffect(() => {
    const now = Date.now() / 1000;
    const currentLiveRounds = new Set<number>();
    
    // Find currently live rounds
    finalDisplayRoundsForSwiper.forEach(round => {
      if (round.variant === "live") {
        currentLiveRounds.add(Number(round.number));
      }
    });
    
    // Check if any previously live rounds are no longer live
    lastLiveRounds.forEach(roundNumber => {
      if (!currentLiveRounds.has(roundNumber)) {
        // This round was live but is no longer live - start calculating
        console.log(`Round ${roundNumber} ended, starting 10s calculating state`);
        setCalculatingRound(roundNumber);
        setCalculatingUntil(now + 10); // 10 seconds from now
      }
    });
    
    // Update the last live rounds
    setLastLiveRounds(currentLiveRounds);
  }, [finalDisplayRoundsForSwiper, lastLiveRounds]);


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
              <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="5"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={283 - 283 * (1 - (timeLeft ?? 0) / 120)}
                  transform="rotate(-90 50 50)"
                />

                {Array.from({ length: 20 }).map((_, i) => {
                  const angle = 15 + i * 18;
                  if (angle < 165 || angle > 195) {
                    return (
                      <line
                        key={i}
                        x1="50"
                        y1="8"
                        x2="50"
                        y2="12"
                        stroke="#4B5563"
                        strokeWidth="1.5"
                        transform={`rotate(${angle} 50 50)`}
                      />
                    );
                  }
                  return null;
                })}
              </svg>

              <div className="absolute flex flex-col items-center justify-center z-10">
                <span className="font-semibold text-white text-[12px] sm:text-[16px] lg:text-[24px]">
                  {timeLeft !== null ? formatTimeLeft(timeLeft) : "Locked"}
                </span>
                <span className="text-[#D1D5DB] text-[8px] sm:text-[10px] lg:text-[12px]">
                  2m
                </span>
              </div>
            </div>
          </div>

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
              modules={[Pagination, EffectCoverflow]}
              className="w-full px-4 sm:px-0"
            >
              {finalDisplayRoundsForSwiper.map((round) => {
                if (!round || !round.number) {
                  console.warn("Skipping invalid round object in Swiper map:", round);
                  return null;
                }
                const roundNumber = Number(round.number);
                const startTimeMs =
                  typeof round.startTime === "number" && !isNaN(round.startTime)
                    ? round.startTime * 1000
                    : 0;
                const lockTime =
                  typeof round.lockTime === "number" &&
                  !isNaN(Number(round.lockTime))
                    ? Number(round.lockTime)
                    : startTimeMs / 1000 + 120;
                const closeTime =
                  typeof round.closeTime === "number" &&
                  !isNaN(Number(round.closeTime))
                    ? Number(round.closeTime)
                    : lockTime + 120;

                const cardVariant = formatCardVariant(round, currentRoundNumber);

                const finalVariant = round.variant || cardVariant;

                return (
                  <SwiperSlide
                    key={round.number}
                    className="flex justify-center items-center"
                  >
                    <PredictionCard
                      variant={
                        calculatingRound === Number(round.number) &&
                        Date.now() / 1000 < calculatingUntil
                          ? "calculating"
                          : finalVariant
                      }
                      roundId={Number(round.number)}
                      roundData={{
                        lockPrice: (round.lockPrice || 0) / 1e8,
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
                      userBets={connected ? userBets : []}
                      isLocked={isLocked}
                      timeLeft={timeLeft}
                    />
                  </SwiperSlide>
                );
              })}
            </Swiper>
            <div className="swiper-pagination !relative !mt-4" />
          </div>

          <div className="xl:hidden">
            <MobileLiveBets liveBets={[]} />
          </div>

          <div className="mt-10">
            <LineChart />
          </div>

          {connected && userBets.length > 0 && (
            <BetsHistory userBets={userBets} />
          )}
        </div>

        <LiveBets currentRound={Number(currentRound?.number) ?? null} />
      </div>
    </div>
  );
}
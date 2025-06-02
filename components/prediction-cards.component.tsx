/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
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
import NumberFlow from "@number-flow/react";
import LiveBets from "./LiveBets";
import { useRoundManager } from "@/hooks/roundManager";
import { Round } from "@/types/round";
import { useSolPredictor } from "@/hooks/useBuyClaim";
// import { BetsHistory } from "./BetsHistory";
// import LineChart from "./LineChart";
import { useLivePrice } from "@/lib/price-utils";
import { useProgram } from "@/hooks/useProgram";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { DotLoader, PuffLoader } from "react-spinners";
import MarketHeader from "./MarketHeader";
import {
  BetFailedToast,
  BetSuccessToast,
  BetSuccessToastMini,
  ClaimFailureToast,
  ClaimSuccessToastMini,
  ConnectWalletBetToast,
  NoClaimableBetsToast,
} from "./toasts";
const BetsHistory = React.lazy(() => import("./BetsHistory"));

const LineChart = React.lazy(() => import("./LineChart"));
export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<any>(null);
  const { publicKey, connected, sendTransaction } = useWallet();
  const connectionRef = useRef<Connection | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [liveRoundPrice, setLiveRoundPrice] = useState(172.5);
  const [previousPrice, setPreviousPrice] = useState(liveRoundPrice);
  const [priceColor, setPriceColor] = useState("text-gray-900");
  const [claimableRewards, setClaimableRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
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
  const lastLiveRoundRef = useRef<number | null>(null);
  const [swiperReady, setSwiperReady] = useState(false);
  const { theme } = useTheme();
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
  } = useRoundManager(5, 0);

  const [isFetchingRounds, setIsFetchingRounds] = useState(false);
  const previousComputedRoundsRef = useRef<Round[]>([]); // Ref to store last valid computed rounds

  // Update claimableAmountRef when claimableBets changes
  useEffect(() => {
    const sum = claimableBets.reduce((tot, b) => tot + b.payout, 0);
    setClaimableRewards(sum);
  }, [claimableBets]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserBets();
    }
  }, [connected, publicKey, fetchUserBets]);
  const {
    price: livePrice,
    isLoading: priceLoading,
    error: priceError,
  } = useLivePrice();

  // Fetch live price periodically
  useEffect(() => {
    const updateLivePrice = async () => {
      if (livePrice !== undefined) {
        // console.log("Live price fetched:", livePrice);
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
    if (previousPrice !== liveRoundPrice) {
      if (liveRoundPrice > previousPrice) {
        setPriceColor("text-green-500"); // Price up - green
      } else if (liveRoundPrice < previousPrice) {
        setPriceColor("text-red-500"); // Price down - red
      }

      setPreviousPrice(liveRoundPrice);

      // Reset color after animation
      const timer = setTimeout(() => {
        setPriceColor("text-gray-900");
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [liveRoundPrice, previousPrice]);

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
      // toast.error("Please connect your wallet to place a bet");

      return;
    }

    try {
      const ok = await handlePlaceBet(roundId, direction === "up", amount);
      if (ok) {
        toast.custom(
          (t) => (
            <>
              <BetSuccessToastMini theme={theme} />
            </>
          ),
          { position: "top-right" }
        );
        await fetchUserBets();
      } else {
        toast.custom((t) => <BetFailedToast theme={theme} />, {
          position: "top-right",
        });
      }
      return ok;
    } catch (error) {
      console.error("Failed to place bet:", error);
      // toast.error("Failed to place bet");
    }
  };

  function SkeletonCard() {
    return (
      <div className="card_container glass rounded-[20px] p-[15px] sm:p-[25px] w-full animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        </div>
        <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        </div>
        <div className="mt-6 flex justify-between">
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const handleClaimRewards = useCallback(async () => {
    if (!connected || !publicKey || !connectionRef.current || !program) {
      // toast.error("Please connect your wallet to claim rewards");
      toast.custom((t) => <ConnectWalletBetToast />, {
        position: "top-right",
      });
      return;
    }

    if (claimableBets.length === 0) {
      toast.custom((t) => <NoClaimableBetsToast theme={theme} />, {
        position: "top-right",
      });
      return;
    }

    setIsClaiming(true);
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

      toast.custom(
        (t) => (
          <ClaimSuccessToastMini
            theme={theme}
            claimableAmount={claimableRewards}
          />
        ),
        {
          position: "top-right",
        }
      );

      // Reset claimable rewards
      setClaimableRewards(0);

      // console.log(`Batched payout claimed successfully: ${signature}`);
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

      toast.custom((t) => <ClaimFailureToast theme={theme} />, {
        position: "top-right",
      });
      // toast.error(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  }, [
    connected,
    publicKey,
    program,
    claimableBets,
    claimableRewards,
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
        ? baseRound.closeTime + offsetNumber * (config?.roundDuration || 360)
        : Math.floor(Date.now() / 1000) +
          offsetNumber * (config?.roundDuration || 360);

    return {
      number: roundNumber.toString(),
      startTime: baseStartTime,
      lockTime: baseStartTime + (config?.lockDuration || 180),
      closeTime: baseStartTime + (config?.roundDuration || 360),
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

    if (n === current) return "next";

    if (n === current - 1) {
      return "live";
    }

    if (n > current) return "later";

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
          : Math.floor(Date.now() / 1000)) + (config?.lockDuration || 180),
      closeTime:
        (typeof currentRound?.closeTime === "number"
          ? currentRound.closeTime
          : Math.floor(Date.now() / 1000)) + (config?.roundDuration || 360),
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
    }
  });

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

  const [expiredRounds, setExpiredRounds] = useState<Round[]>([]);

  // whenever your hook gives you fresh `previousRounds` (e.g. on fetchMoreRounds)
  useEffect(() => {
    if (!previousRounds?.length || currentRoundNumber == null) return;

    // take the 3 most recent rounds that are fully expired:
    const newExpired = previousRounds
      .filter((r) => Number(r.number) < currentRoundNumber - 1)
      .sort((a, b) => Number(a.number) - Number(b.number))
      .slice(-3);

    setExpiredRounds(newExpired);
  }, [previousRounds, currentRoundNumber]);

  const computedDisplayRounds = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);

    // 1. Find the live round (the one that just ended)
    const liveRound = previousRounds.find(
      (r) => Number(r.number) === currentRoundNumber - 1
    );

    const nextRound =
      previousRounds.find((r) => Number(r.number) === currentRoundNumber) ||
      ({
        number: currentRoundNumber.toString(),
        startTime: now,
        lockTime: now + (config?.lockDuration || config?.lockDuration || 180),
        closeTime: now + (config?.lockDuration || 180) * 2,
        totalAmount: 0,
        totalBullAmount: 0,
        totalBearAmount: 0,
        isActive: true,
        status: "started",
        lockPrice: 0,
        endPrice: 0,
        rewardBaseCalAmount: 0,
        rewardAmount: 0,
      } as unknown as Round);

    // 3. Real "later" rounds (future ones)
    const laterRounds = previousRounds
      .filter((r) => {
        const variant = formatCardVariant(r, currentRoundNumber);
        return (
          variant === "later" &&
          typeof r.closeTime === "number" &&
          r.closeTime > now
        );
      })
      .slice(0, 1);

    // 4. Dummy "later" if none real
    const dummyLaterRounds: Round[] = [];
    if (nextRound && laterRounds.length === 0) {
      dummyLaterRounds.push(createDummyLaterRound(nextRound, 1));
    }

    // 5. Compose final array: static expired + dynamic live/next/later
    return [
      ...expiredRounds, // Only updated on explicit history fetches
      liveRound,
      nextRound,
      ...laterRounds,
      ...dummyLaterRounds,
    ].filter(Boolean);
  }, [
    expiredRounds,
    previousRounds,
    currentRoundNumber,
    config,
    createDummyLaterRound,
    formatCardVariant,
  ]);
  console.log(config)
  // Update the ref with the latest non-empty computed rounds
  useEffect(() => {
    if (computedDisplayRounds.length > 0) {
      previousComputedRoundsRef.current = computedDisplayRounds.filter(
        (round): round is Round => round !== undefined
      );
    }
  }, [computedDisplayRounds]);

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
    if (typeof currentRoundNumber === "number") {
      const fallbackCurrentTime = Math.floor(Date.now() / 1000);
      const fallbackRounds: Round[] = [];

      for (let i = 0; i < 3; i++) {
        const roundNumber = currentRoundNumber - 1 + i;
        const baseTime =
          fallbackCurrentTime + i * (config?.roundDuration || 360);

        fallbackRounds.push({
          number: roundNumber.toString(),
          startTime: baseTime - (config?.roundDuration || 360),
          lockTime: baseTime - (config?.lockDuration || 180),
          closeTime: baseTime,
          totalAmount: 0,
          totalBullAmount: 0,
          totalBearAmount: 0,
          isActive: i === 1, // Make the middle one active
          status: i === 0 ? "expired" : i === 1 ? "next" : "later",
        } as unknown as Round);
      }
    }

    return [];
  }, [computedDisplayRounds, currentRoundNumber]);

  const liveIndex = useMemo(() => {
    try {
      // Use finalDisplayRoundsForSwiper for calculating liveIndex

      if (finalDisplayRoundsForSwiper.length > 0) {
        const firstRound = finalDisplayRoundsForSwiper[0];
        if (formatCardVariant(firstRound, currentRoundNumber) === "live") {
          return 0; // Live round is at index 0
        }
      }

      const index = finalDisplayRoundsForSwiper.findIndex(
        (r) => r && formatCardVariant(r, currentRoundNumber) === "live"
      );

      if (index === -1) {
        // If no live round, try to find next round
        const nextIndex = finalDisplayRoundsForSwiper.findIndex(
          (r) => formatCardVariant(r, currentRoundNumber) === "next"
        );
        return nextIndex >= 0 ? nextIndex : 0;
      }

      return index;
    } catch (error) {
      console.error("Error finding live index:", error);
      return 0; // Return 0 instead of -1 to show first slide
    }
  }, [finalDisplayRoundsForSwiper, currentRoundNumber, formatCardVariant]);

  const prevLiveRef = useRef<number>(liveIndex);
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;

    // only run when liveIndex actually changes
    if (prevLiveRef.current !== liveIndex) {
      swiper.slideTo(liveIndex, /* duration= */ 0);
      prevLiveRef.current = liveIndex;
    }
  }, [liveIndex]);

  console.log("Final display rounds for Swiper:", finalDisplayRoundsForSwiper);
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiperReady || liveIndex < 0) return;

    const currentLiveRound = finalDisplayRoundsForSwiper.find(
      (r) => formatCardVariant(r, currentRoundNumber) === "live"
    );

    const currentLiveRoundNumber = currentLiveRound
      ? Number(currentLiveRound.number)
      : null;
    const shouldJumpToLive =
      (!initialSlideJumped.current && swiperReady) || // Initial load when swiper is ready
      (currentLiveRoundNumber !== null &&
        currentLiveRoundNumber !== lastLiveRoundRef.current) ||
      timeLeft === 0;

    if (shouldJumpToLive && currentLiveRound) {
      try {
        // console.log(
        //   `Jumping to live slide at index ${liveIndex}, round ${currentLiveRoundNumber}`
        // );
        // Use immediate jump (0ms) for initial load, smooth for updates
        const duration = initialSlideJumped.current ? 300 : 0;
        swiper.slideTo(liveIndex, duration);
        initialSlideJumped.current = true;
        lastLiveRoundRef.current = currentLiveRoundNumber;
      } catch (error) {
        console.error("Error sliding to live index:", error);
      }
    }
  }, [
    liveIndex,
    finalDisplayRoundsForSwiper,
    currentRoundNumber,
    timeLeft,
    formatCardVariant,
    swiperReady,
  ]);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || swiperReady) return;

    // on first ready, jump to your initial liveIndex
    swiper.slideTo(liveIndex, 0);
    initialSlideJumped.current = true;
  }, [swiperReady]);

  useEffect(() => {
    if (timeLeft === 0) {
      initialSlideJumped.current = false;
      safeFetchMoreRounds();
    }
  }, [timeLeft, safeFetchMoreRounds]);

  // Improve visibility change handler with better API error handling
  useEffect(() => {
    let isRefreshing = false;

    const handleVisibility = async () => {
      if (document.visibilityState === "visible" && !isRefreshing) {
        isRefreshing = true;

        initialSlideJumped.current = false;

        try {
          const tasks = [];

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

          await Promise.allSettled(tasks);
        } catch (error) {
          console.error("Error during visibility change refresh:", error);
        } finally {
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

  const formatPrice = (price: any): number | undefined => {
    if (price === null || price === undefined) return undefined;
    const numPrice = Number(price);
    if (isNaN(numPrice)) return undefined;
    // Assuming blockchain prices are scaled by 1e8
    return numPrice > 1000000 ? numPrice / 1e8 : numPrice;
  };

  
  const isDataLoaded = finalDisplayRoundsForSwiper.length > 4;
  const skeletonInitial = Math.floor(7 / 2);
  const initial = isDataLoaded ? liveIndex : skeletonInitial;

  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-5 md:mt-6 lg:mt-[70px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
        <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
          <MarketHeader
            liveRoundPrice={liveRoundPrice}
            priceColor={priceColor}
            isLocked={isLocked}
            timeLeft={timeLeft}
            lockDuration={config?.lockDuration}
            theme={theme === "dark" ? "dark" : "light"}
            connected={connected}
            userBalance={userBalance}
            claimableRewards={claimableRewards}
            isClaiming={isClaiming}
            onClaim={handleClaimRewards}
            formatTimeLeft={formatTimeLeft}
          />
          
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
                  To start predicting SOL price movements and placing bets,
                  please connect your Solana wallet.
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
                // key={liveIndex}
                key={`swiper-${initial}`}
                initialSlide={initial}
                onBeforeInit={(swiper) => {
                  swiper.params.initialSlide = initial;
                }}
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                  setSwiperReady(true);
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
                  slideShadows: false,
                }}
                modules={[Pagination, EffectCoverflow]}
                className="w-full px-4 sm:px-0"
              >
                {!isDataLoaded
                  ? Array.from({ length: 7 }).map((_, i) => (
                      <SwiperSlide
                        key={`skeleton-${i}`}
                        className="flex justify-center items-center"
                      >
                        <SkeletonCard />
                      </SwiperSlide>
                    ))
                  : finalDisplayRoundsForSwiper.map((round, index) => {
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
                        typeof round.startTime === "number" &&
                        !isNaN(round.startTime)
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
                          : startTimeMs / 1000 + (config?.lockDuration || 180);
                      const closeTime =
                        round.closeTime instanceof Date
                          ? round.closeTime.getTime() / 1000
                          : typeof round.closeTime === "string" &&
                            !isNaN(Number(round.closeTime))
                          ? Number(round.closeTime)
                          : lockTime + (config?.lockDuration || 180);

                      // Get the variant for this card
                      const cardVariant = formatCardVariant(
                        round,
                        currentRoundNumber
                      );

                      if (cardVariant === 'expired') {
                        console.log(`Expired Round ${round.number}:`, {
                          lockPrice: round.lockPrice,
                          endPrice: round.endPrice,
                          formattedLockPrice: formatPrice(round.lockPrice),
                          formattedClosePrice: formatPrice(round.endPrice)
                        });
                      }

                      return (
                        <SwiperSlide
                          key={round.number} // Ensure key is stable and unique
                          className="flex justify-center items-center"
                        >
                          <PredictionCard
                            variant={cardVariant}
                            roundId={Number(round.number)}
                            roundData={{
                              lockPrice: formatPrice(round.lockPrice),
                              closePrice: formatPrice(round.endPrice),
                              currentPrice: (() => {
                                // For expired rounds, use the close price as current price
                                if (cardVariant === 'expired') {
                                  return formatPrice(round.endPrice) || formatPrice(round.lockPrice) || liveRoundPrice;
                                }
                                // For live/calculating rounds, use live price
                                return liveRoundPrice;
                              })(),
                              prizePool:
                                (round.totalAmount || 0) / LAMPORTS_PER_SOL,
                              upBets:
                                (round.totalBullAmount || 0) / LAMPORTS_PER_SOL,
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

          <div className="mt-10">
            <Suspense fallback={<PuffLoader color="#06C729" size={30} />}>
              <LineChart />
            </Suspense>
          </div>

          {connected && userBets.length > 0 && (
            <Suspense fallback={<PuffLoader color="#06C729" size={30} />}>
              <BetsHistory userBets={userBets} />
            </Suspense>
          )}
        </div>
        <LiveBets
          currentRound={Number(currentRound?.number) ?? null}
          key={currentRound?.number}
        />
      </div>
    </div>
  );
}

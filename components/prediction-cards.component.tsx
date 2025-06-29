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
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import MobileLiveBets from "./MobileBets";
import LiveBets from "./LiveBets";
import { useRoundManager } from "@/hooks/roundManager";
import { Round } from "@/types/round";
import { useSolPredictor } from "@/hooks/useBuyClaim";
import { useLivePrice } from "@/lib/price-utils";

import io from "socket.io-client";
import { useProgram } from "@/hooks/useProgram";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { PuffLoader } from "react-spinners";
import MarketHeader from "./MarketHeader";
import {
  ClaimCancelledToast,
  ClaimFailureToast,
  ClaimSuccessToast,
  ConnectWalletBetToast,
  MarketPausedToast,
  NoClaimableBetsToast,
} from "./toasts";
import { API_URL, RPC_URL } from "@/lib/config";
import { useTranslation } from "next-i18next";
const BetsHistory = React.lazy(() => import("./BetsHistory"));

const LineChart = React.lazy(() => import("./LineChart"));
export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<any>(null);
  const { publicKey, connected, sendTransaction } = useWallet();
  const connectionRef = useRef<Connection | null>(null);
  const [userBalance, setUserBalance] = useState(-1);
  const [liveRoundPrice, setLiveRoundPrice] = useState(0);
  const [previousPrice, setPreviousPrice] = useState(liveRoundPrice);
  const [priceColor, setPriceColor] = useState("text-gray-900");
  const [claimableRewards, setClaimableRewards] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimingRoundId, setClaimingRoundId] = useState<number | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const {
    handlePlaceBet,
    handleClaimPayout,
    claimableBets,
    userBets,
    fetchUserBets,
  } = useSolPredictor();
  const { program } = useProgram();
  const initialSlideJumped = useRef(false);
  const lastLiveRoundRef = useRef<number | null>(null);
  const [swiperReady, setSwiperReady] = useState(false);
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const {
    config,
    currentRound,
    treasuryFee,
    previousRounds,
    fetchMoreRounds,
    timeLeft,
    isLocked,
    getRoundStatus,
  } = useRoundManager(5, 0);
  const [isFetchingRounds, setIsFetchingRounds] = useState(false);
  const previousComputedRoundsRef = useRef<Round[]>([]); // Ref to store last valid computed rounds
  const [liveTotal, setLiveTotal] = useState<number>(0);

  useEffect(() => {
    const sum = claimableBets.reduce((tot, b) => tot + (b.payout || 0), 0);
    setClaimableRewards(sum);
  }, [claimableBets]); // Remove isClaiming dependency

  const bonusRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (connected && publicKey) {
      fetchUserBets();
    }
  }, [connected, publicKey, fetchUserBets, config?.currentRound]);
  const {
    price: livePrice,
    isLoading: priceLoading,
    error: priceError,
  } = useLivePrice();

    const tempKeypairRef = useRef<Keypair>(null);
  if (!tempKeypairRef.current) {
    tempKeypairRef.current = Keypair.generate();
  }
  const effectivePublicKey = connected
    ? publicKey!
    : tempKeypairRef.current.publicKey;


  const fetchBalance = useCallback(async () => {
    if (!effectivePublicKey || !connectionRef.current) return;
    const lamports = await connectionRef.current.getBalance(effectivePublicKey);
    setUserBalance(lamports / LAMPORTS_PER_SOL);
  }, [effectivePublicKey]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUserBalance(0);
      return;
    }

    const conn = new Connection(RPC_URL, { commitment: "confirmed" });
    connectionRef.current = conn;

    let active = true;

    // 1. Initial fetch on connect
    const initialFetch = async () => {
      try {
        const lamports = await conn.getBalance(publicKey);
        if (active) {
          setUserBalance(lamports / LAMPORTS_PER_SOL);
        }
      } catch (error) {
        console.error("Failed to fetch initial balance:", error);
      }
    };

    initialFetch();

    // 2. Subscribe to live balance changes - this is the key fix
    const listenerId = conn.onAccountChange(
      publicKey,
      (accountInfo) => {
        if (active) {
          console.log("Balance updated via subscription:", accountInfo.lamports / LAMPORTS_PER_SOL);
          setUserBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
        }
      },
      "confirmed"
    );

    return () => {
      active = false;
      conn.removeAccountChangeListener(listenerId);
    };
  }, [connected, publicKey, fetchBalance]);


// useEffect(() => {
//   // whenever we place a bet, re‐fetch on‐chain balance
//   const onBet = () => {
//     // Add a small delay to ensure the transaction is confirmed
//     setTimeout(() => {
//       fetchBalance();
//     }, 1000);
//     bonusRef.current?.();      
//   };
  
//   window.addEventListener("betPlaced", onBet);
  
//   // after any successful or failed claim, we also want fresh balance
//   const onClaimSuccess = () => {
//     setTimeout(() => {
//       fetchBalance();
//     }, 1000);
//   };
  
//   window.addEventListener("claimSuccess", onClaimSuccess);
//   window.addEventListener("claimFailure", fetchBalance);

//   return () => {
//     window.removeEventListener("betPlaced", onBet);
//     window.removeEventListener("claimSuccess", onClaimSuccess);
//     window.removeEventListener("claimFailure", fetchBalance);
//   };
// }, [fetchBalance]);;

  useEffect(() => {
    const updateLivePrice = async () => {
      if (livePrice !== undefined) {
        setLiveRoundPrice(livePrice!);
      }
    };

    updateLivePrice();
  }, [livePrice]);
  const safeFetchMoreRounds = useCallback(async () => {
    setIsFetchingRounds(true);
    try {
      await fetchMoreRounds?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingRounds(false);
    }
  }, [fetchMoreRounds]);

  useEffect(() => {

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

  const handleBet = async (
    direction: "up" | "down",
    amount: number,
    roundId: number
  ) => {
    if (!connected || !publicKey || !connectionRef.current) {
      return false;
    }

    try {
      const ok = await handlePlaceBet(roundId, direction === "up", amount);
      if (ok) {
        // Don't fetch balance here - let the event handler do it
        await new Promise(resolve => setTimeout(resolve, 2000));
        bonusRef.current?.();
        await Promise.all([fetchUserBets(), fetchMoreRounds(), fetchBalance]);
        // Force a re-render of the cards
        setSwiperReady(false);
        setTimeout(() => setSwiperReady(true), 100);
      }
      return ok || false;
    } catch (error) {
      console.error("Failed to place bet:", error);
      return false;
    }
  };

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    const handleRoundUpdate = (data: any) => {
      if (data.type === "roundEnded" || data.type === "roundStarted") {
        safeFetchMoreRounds();
        fetchUserBets();
      }
    };

    const handleNewBetPlaced = (data: any) => {
      // We only want to refresh the prizePool when anyone places a bet:
      safeFetchMoreRounds();
    };

    socket.on("roundUpdate", handleRoundUpdate);
    socket.on("newBetPlaced", handleNewBetPlaced);

    return () => {
      socket.off("roundUpdate", handleRoundUpdate);
      socket.off("newBetPlaced", handleNewBetPlaced);
      socket.disconnect();
    };
  }, [safeFetchMoreRounds]);
  useEffect(() => {
    const onBetPlaced = (event: Event) => {
      const timer = setTimeout(() => {
        fetchUserBets();
        safeFetchMoreRounds();
      }, 1000);
      // Don't return the clearTimeout function here - it should be handled in the main cleanup
    };

    window.addEventListener("betPlaced", onBetPlaced);
    return () => {
      window.removeEventListener("betPlaced", onBetPlaced);
    };
  }, [fetchUserBets, safeFetchMoreRounds]);

  function SkeletonCard() {
    return (
      <div className="card_container glass  md:min-w-[240px] min-w-[220px]  rounded-[20px] p-[15px] sm:p-[25px] w-full animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 "></div>
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3 "></div>
        </div>
        <div className="h-10 my-4 bg-gray-300 dark:bg-gray-700 w-full rounded-2xl"></div>
        <div className="h-[150px] bg-gray-300 dark:bg-gray-700 rounded-2xl mb-8"></div>
        <div className="">
          <div className="flex justify-between items-center">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="flex my-4 justify-between items-center">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="flex my-4 justify-between items-center">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <div className="h-10 bg-gray-300 dark:bg-gray-700 w-full rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Replace the handleClaimRewards function with better state management:



  // 2) Use effectivePublicKey in your balance‐fetch:



  const handleClaimRewards = useCallback(async () => {
    if (!connected || !publicKey || !connectionRef.current || !program) {
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
    const claimedAmount = claimableRewards; // Store before clearing

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
        { skipPreflight: false }
      );

      await connectionRef.current.confirmTransaction(signature);
      
      // **immediately** grab the fresh balance
      // const lam = await connectionRef.current.getBalance(publicKey);
      // setUserBalance(lam / LAMPORTS_PER_SOL);

      // then refresh your bets
      await new Promise(resolve => setTimeout(resolve, 2000));
      await Promise.all([fetchUserBets(), fetchMoreRounds(), fetchBalance()]);
      setJustClaimed(true);
      
      setClaimableRewards(0);
      setJustClaimed(true);

      // Force a complete re-render by updating swiper
      setSwiperReady(false);
      setTimeout(() => setSwiperReady(true), 500);

      setIsClaiming(false);
      window.dispatchEvent(new CustomEvent("claimSuccess"));

      toast.custom(
        (t) => (
          <ClaimSuccessToast theme={theme} claimableAmount={claimedAmount} />
        ),
        { position: "top-center" }
      );
    } catch (err: any) {
      console.error("Failed to claim rewards:", err);

      // detect user cancellation
      const isCancelled =
      err.name === "WalletSendTransactionError" ||
      err.name === "WalletSignTransactionError" ||
      err.message.includes("User rejected") ||
      err.message.includes("Transaction was not signed");

    if (isCancelled) {
      // Show the cancelled toast
      toast.custom((t) => <ClaimCancelledToast theme={theme} />, {
        position: "top-right",
      });
      window.dispatchEvent(new CustomEvent("claimFailure"));
      setIsClaiming(false);
      return;
    }

    if (err.message.includes("6012")) {
      toast.custom((t) => <MarketPausedToast theme={theme} />, {
        position: "top-right",
      });
      window.dispatchEvent(new CustomEvent("claimFailure"));
      return;
    }

    window.dispatchEvent(new CustomEvent("claimFailure"));
    toast.custom((t) => <ClaimFailureToast theme={theme} />, {
      position: "top-right",
    });
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
    theme,
  ]);
  useEffect(() => {
    const onClaimAll = () => {
      handleClaimRewards();
    };
    window.addEventListener("claimAll", onClaimAll as EventListener);
    return () => {
      window.removeEventListener("claimAll", onClaimAll as EventListener);
    };
  }, [handleClaimRewards]);

  useEffect(() => {
    const onClaimRound = (e: CustomEvent) => {
      const { roundId } = e.detail as { roundId: number };

      if (!claimableBets.find((b) => b.roundNumber === roundId)) {
        // No claimable bet for that round? Bail out.
        return;
      }

      // call your existing `handleClaimPayout` for just that one round:
      (async () => {
        try {
          setIsClaiming(true);
          setClaimingRoundId(roundId);
          // build a transaction that claims only roundId
          const instruction = await handleClaimPayout(roundId);
          const tx = new Transaction().add(instruction);
          const { blockhash } =
            await connectionRef.current!.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = publicKey!;

          const sig = await sendTransaction(tx, connectionRef.current!, {
            skipPreflight: false,
          });
           // confirm on‐chain
          await connectionRef.current!.confirmTransaction(sig, "confirmed");

          // immediately fetch balance
          // const lam = await connectionRef.current!.getBalance(publicKey!);
          // setUserBalance(lam / LAMPORTS_PER_SOL);

          // then refresh bets
          await fetchUserBets();
          bonusRef.current?.();
          // 🔥 Replace the `0` below with the actual payout amount from claimableBets:
          const thisPayout =
            claimableBets.find((b) => b.roundNumber === roundId)?.payout ?? 0;

          setIsClaiming(false);
          window.dispatchEvent(new CustomEvent("claimSuccess"));
          toast.custom(
            (t) => (
              <ClaimSuccessToast theme={theme} claimableAmount={thisPayout} />
            ),
            { position: "top-center" }
          );
        } catch (err) {
          console.error("Single‐round claim failed", err);
          setIsClaiming(false);
          window.dispatchEvent(new CustomEvent("claimFailure"));
          toast.custom((t) => <ClaimFailureToast theme={theme} />, {
            position: "top-right",
          });
        } finally {
          setClaimingRoundId(null);
        }
      })();
    };

    window.addEventListener("claimRound", onClaimRound as EventListener);
    return () => {
      window.removeEventListener("claimRound", onClaimRound as EventListener);
    };
  }, [
    claimableBets,
    handleClaimPayout,
    fetchUserBets,
    connectionRef,
    publicKey,
    sendTransaction,
    theme,
  ]);

  useEffect(() => {
    const onClaimAll = () => setIsClaiming(true);
    const onClaimDone = () => {
      setIsClaiming(false);
      setClaimingRoundId(null);
    };

    window.addEventListener("claimAll", onClaimAll);
    window.addEventListener("claimSuccess", onClaimDone);
    window.addEventListener("claimFailure", onClaimDone);

    return () => {
      window.removeEventListener("claimAll", onClaimAll);
      window.removeEventListener("claimSuccess", onClaimDone);
      window.removeEventListener("claimFailure", onClaimDone);
    };
  }, []);

  const getSlidesPerView = () => {
    if (!mounted) return 1;
    if (screenWidth < 640) return 1;
    if (screenWidth < 1024) return 2;
    return 3;
  };

  // Create dummy later rounds
  const createDummyLaterRound = useCallback(
    (baseRound: Round, offsetNumber: number): Round => {
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
    },
    [config?.lockDuration, config?.roundDuration]
  );

  const formatCardVariant = useCallback(
    (round: Round, current: number) => {
      const status = getRoundStatus(round);
      const n = Number(round.number);

      if (n === current) return "next";
      if (n === current - 1) return "live";
      if (n > current) return "later";
      return "expired";
    },
    [getRoundStatus]
  );
  const handleSlideChange = () => {
    if (!swiperRef.current) return;
    const swiper = swiperRef.current;
  };

  const handleLiveTotalChange = (sum: number) => {
    setLiveTotal(sum);
  };

  const currentRoundNumber =
    Number(config?.currentRound) ?? Number(currentRound?.number) ?? null;

  // if (currentRoundNumber == null) {return <DotLoader />};
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
    }, 5_000);

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

    let liveRound: Round | undefined = previousRounds.find(
      (r) => Number(r.number) === currentRoundNumber - 1
    );

    if (!liveRound && typeof currentRoundNumber === "number") {
      const dummyRoundNumber = currentRoundNumber - 1;
      liveRound = {
        number: dummyRoundNumber.toString(),
        startTime: now - (config?.roundDuration || 360),
        lockTime:
          now - (config?.roundDuration || 360) + (config?.lockDuration || 180),
        closeTime: now,
        totalAmount: 0,
        totalBullAmount: 0,
        totalBearAmount: 0,
        isActive: false,
        status: "locked", // or “expired”/“live” – but it just reserves a placeholder slot.
      } as unknown as Round;
    }

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

    const dummyLaterRounds: Round[] = [];
    if (nextRound && laterRounds.length === 0) {
      dummyLaterRounds.push(createDummyLaterRound(nextRound, 1));
    }

    return [
      ...expiredRounds, // Only updated on explicit history fetches
      liveRound!,
      nextRound,
      ...laterRounds,
      ...dummyLaterRounds,
    ].filter(Boolean);
  }, [
    expiredRounds,
    previousRounds,
    currentRoundNumber,
    config?.lockDuration,
    config?.roundDuration,
    createDummyLaterRound,
    formatCardVariant,
  ]);
  useEffect(() => {
    if (computedDisplayRounds.length > 0) {
      previousComputedRoundsRef.current = computedDisplayRounds.filter(
        (round): round is Round => round !== undefined
      );
    }
  }, [computedDisplayRounds]);

  // Determine the final set of rounds to display in the Swiper
  const finalDisplayRoundsForSwiper = useMemo(() => {
    if (computedDisplayRounds.length > 0) {
      return computedDisplayRounds;
    }

    if (previousComputedRoundsRef.current.length > 0) {
      return previousComputedRoundsRef.current;
    }

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
  }, [computedDisplayRounds]);

  const liveIndex = useMemo(() => {
    try {
      if (finalDisplayRoundsForSwiper.length === 0) return 0;
      
      // Always prioritize finding the actual live round first
      const liveRoundIndex = finalDisplayRoundsForSwiper.findIndex(
        (r) => r && formatCardVariant(r, currentRoundNumber) === "live"
      );
      
      if (liveRoundIndex !== -1) {
        return liveRoundIndex;
      }
      
      // If no live round found, look for next round
      const nextRoundIndex = finalDisplayRoundsForSwiper.findIndex(
        (r) => r && formatCardVariant(r, currentRoundNumber) === "next"
      );
      
      return nextRoundIndex !== -1 ? nextRoundIndex : 0;
    } catch (error) {
      console.error("Error finding live index:", error);
      return 0;
    }
  }, [finalDisplayRoundsForSwiper, currentRoundNumber, formatCardVariant]);

  // Update the swiper initialization to always use liveIndex on refresh
  const getInitialSlide = useCallback(() => {
    // On page refresh or initial load, always go to live index
    if (finalDisplayRoundsForSwiper.length > 0) {
      return liveIndex;
    }
    return 0;
  }, [liveIndex, finalDisplayRoundsForSwiper.length]);


  const prevLiveRef = useRef<number>(liveIndex);
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || !swiperReady) return;

    // Always jump to live index when swiper becomes ready or when liveIndex changes
    swiper.slideTo(liveIndex, initialSlideJumped.current ? 300 : 0);
    
    if (!initialSlideJumped.current) {
      initialSlideJumped.current = true;
    }
  }, [liveIndex, swiperReady]);

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

  const prevTimeLeft = useRef<number | null>(null);

  useEffect(() => {
    if (prevTimeLeft.current == null && timeLeft === 0) {
      // immediate sync (or you can delay a bit if you want):
      fetchUserBets();
      safeFetchMoreRounds();
      prevTimeLeft.current = 0;
      return;
    }

    if (prevTimeLeft.current! > 0 && timeLeft === 0) {
      const timer = setTimeout(() => {
        fetchUserBets();
        safeFetchMoreRounds();
      }, 2000);
      return () => clearTimeout(timer);
    }

    prevTimeLeft.current = timeLeft;
  }, [timeLeft, fetchUserBets, safeFetchMoreRounds]);

  const didFetchAtZero = useRef(false);
  useEffect(() => {
    if (timeLeft === 0 && !didFetchAtZero.current) {
      didFetchAtZero.current = true;
      Promise.all([fetchUserBets(), safeFetchMoreRounds()]);
      initialSlideJumped.current = false;
    }
    if (timeLeft! > 0) {
      didFetchAtZero.current = false;
    }
  }, [timeLeft, fetchUserBets, safeFetchMoreRounds]);

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

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const upd = () => setIsOffline(!navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);

  if (mounted && isOffline) {
    return (
      <div className="w-full p-4 text-center text-red-500">
        Unable to load data. Check your internet connection.
      </div>
    );
  }

  // if (priceError) {
  //   return (
  //     <div className="w-full p-4 text-center text-red-500">
  //       Unable to load live price. <button onClick={() => window.location.reload()} className="underline">Retry</button>
  //     </div>
  //   );
  // }
  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-5 md:mt-6 lg:mt-[70px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
        <div className=" gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
          <MarketHeader
            // key={`header-${claimableRewards}-${isClaiming}-${claimableBets.length}`}
            liveRoundPrice={liveRoundPrice}
            priceColor={priceColor}
            isLocked={isLocked}
            timeLeft={timeLeft}
            lockDuration={config?.lockDuration || 180}
            registerBonusRefresh={(fn) => {
              bonusRef.current = fn;
            }}
            theme={theme === "dark" ? "dark" : "light"}
            connected={connected}
            userBalance={userBalance}
            claimableRewards={justClaimed ? 0 : claimableRewards}
            isClaiming={isClaiming}
            onClaim={() => {
              window.dispatchEvent(new CustomEvent("claimAll"));
              // handleClaimRewards();
            }}
            formatTimeLeft={formatTimeLeft}
          />

          {config?.isPaused && (
            <div className="absolute z-10 left-1/3">
              <MarketPausedToast theme={theme} />
            </div>
          )}

          {/* // Show wallet connection prompt instead of cards when not connected
            // <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            //   <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 max-w-md mx-auto text-center">
            //     <Image
            //       className="w-16 h-16 object-contain opacity-50"
            //       src="/assets/solana_logo.png"
            //       alt="Solana"
            //       width={64}
            //       height={64}
            //     />
            //     <h3 className="text-xl font-semibold">{t("closed.title")}</h3>
            //     <p className="text-sm opacity-70">{t("closed.message")}</p>
            //     <div className="flex flex-col gap-2 text-xs opacity-60">
            //       <p>• {t("closed.list1")}</p>
            //       <p>• {t("closed.list2")}</p>
            //       <p>• {t("closed.list3")}</p>
            //       <p>• {t("closed.list4")}</p>
            //     </div>
            //   </div>
            // </div> */}

          <div className="relative my-4 px-4 md:px-0">
            <Swiper
              // key={liveIndex}
              key={`swiper-${liveIndex}-${finalDisplayRoundsForSwiper.length}`} // Force re-render when live index changes
              initialSlide={getInitialSlide()}
              onBeforeInit={(swiper) => {
                swiper.params.initialSlide = getInitialSlide();
              }}
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                setSwiperReady(true);
                setTimeout(() => {
                  swiper.slideTo(liveIndex, 0);
                }, 0);
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
              breakpoints={{
                // when window width is >= 0px
                0: {
                  slidesPerView: 1.45,
                  spaceBetween: 0,
                },

                // when window width is >= 1024px
                1024: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                  coverflowEffect: {
                    rotate: 50,
                    depth: 100,
                    modifier: 1,
                    slideShadows: false,
                  },
                },
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
                :(finalDisplayRoundsForSwiper.map((round, index) => {
                    if (!round || !round.number) {
                      // Add a check for valid round object
                      console.warn(
                        "Skipping invalid round object in Swiper map:",
                        round
                      );
                      return null;
                    }
                    const roundNumber = Number(round.number);
                    const isClaimableForThisRound = claimableBets.some(
                      (b) => b.roundNumber === roundNumber
                    );
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
                              if (cardVariant === "expired") {
                                return (
                                  formatPrice(round.endPrice) ||
                                  formatPrice(round.lockPrice) ||
                                  liveRoundPrice
                                );
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
                          userBets={userBets} // Only show user bets if connected
                          isLocked={isLocked}
                          timeLeft={timeLeft}
                          liveTotalForThisRound={liveTotal}
                          isClaimable={isClaimableForThisRound}
                          isClaiming={
                            isClaiming || claimingRoundId === roundNumber
                          }
                          claimableBets={claimableBets}
                        />
                      </SwiperSlide>
                    );
                  }))}
            </Swiper>
          </div>

          <div className="xl:hidden">
            <MobileLiveBets
              onLiveTotalChange={handleLiveTotalChange}
              currentRound={Number(currentRound?.number) ?? null}
            />
          </div>

          <div className="mt-10">
            <Suspense>
              <LineChart />
            </Suspense>
          </div>

          {connected && userBets.length > 0 && (
            <BetsHistory
              currentRound={currentRoundNumber!}
              userBets={userBets}
            />
          )}
        </div>
        <LiveBets
          onLiveTotalChange={handleLiveTotalChange}
          currentRound={Number(currentRound?.number) ?? null}
          key={currentRound?.number}
        />
      </div>
    </div>
  );
}

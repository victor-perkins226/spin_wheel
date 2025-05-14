"use client";

import { useRef, useState, useEffect } from "react";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@project-serum/anchor";
import { MobileLiveBets } from "./MobileBets";
// import { BetsHistory } from "./BetsHistory";
import LiveBets from "./LiveBets";
import idl from "@/lib/idl.json";
import { useRoundManager } from "@/hooks/roundManager";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Round, UserBet } from "@/types/round";


const queryClient = new QueryClient();

const PREDICTION_CONTRACT = "CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT";

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<any>(null);
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
  const connectionRef = useRef<Connection | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [liveRoundPrice, setLiveRoundPrice] = useState(50.5);
  const [claimableRewards, setClaimableRewards] = useState(0);

  const {
    config,
    currentRound,
    previousRounds,
    totalPreviousRounds,
    isLoading,
    isPaused,
    getRoundOutcome,
    fetchMoreRounds,
    timeLeft,
    isLocked,
  } = useRoundManager(5, 0);

  useEffect(() => {
    connectionRef.current = new Connection(clusterApiUrl("devnet"), "confirmed");

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

    const fetchUserBets = async () => {
      const mockBets: UserBet[] = [
        { roundId: currentRound?.number! - 1, direction: "up", status: "WON", amount: 0.5 },
        { roundId: currentRound?.number! - 2, direction: "down", status: "LOST", amount: 0.3 },
      ];
      setUserBets(mockBets);
    };

    const fetchClaimableRewards = async () => {
      setClaimableRewards(0);
    };

    fetchBalance();
    fetchUserBets();
    fetchClaimableRewards();
  }, [connected, publicKey, currentRound?.number]);

  const handlePlaceBet = async (direction: "up" | "down", amount: number, roundId: number) => {
    if (!connected || !publicKey || !signTransaction || !sendTransaction || !connectionRef.current) {
      alert("Please connect your wallet");
      return;
    }

    try {
      const provider = new AnchorProvider(connectionRef.current, { publicKey, signTransaction, sendTransaction }, {});
      const program = new Program(idl as any, new PublicKey(PREDICTION_CONTRACT), provider);
      const config = new PublicKey("CONFIG_PUBKEY");
      const round = new PublicKey("ROUND_PUBKEY");
      const escrow = new PublicKey("ESCROW_PUBKEY");
      const userBet = new PublicKey("USER_BET_PUBKEY");

      await program.rpc.placeBet(new BN(amount * LAMPORTS_PER_SOL), direction === "up", new BN(roundId), {
        accounts: {
          config,
          round,
          userBet,
          user: publicKey,
          escrow,
          systemProgram: PublicKey.default,
        },
      });

      alert(`Bet placed: ${amount} SOL ${direction} on round ${roundId}`);
    } catch (error) {
      console.error("Failed to place bet:", error);
      alert("Failed to place bet");
    }
  };

  const handleClaimRewards = async (roundId: number) => {
    if (!connected || !publicKey || !signTransaction || !sendTransaction || !connectionRef.current) {
      alert("Please connect your wallet");
      return;
    }

    try {
      const provider = new AnchorProvider(connectionRef.current, { publicKey, signTransaction, sendTransaction }, {});
      const program = new Program(idl as any, new PublicKey(PREDICTION_CONTRACT), provider);
      const config = new PublicKey("CONFIG_PUBKEY");
      const round = new PublicKey("ROUND_PUBKEY");
      const userBet = new PublicKey("USER_BET_PUBKEY");
      const treasury = new PublicKey("TREASURY_PUBKEY");
      const user = publicKey;

      await program.rpc.claimPayout(new BN(roundId), {
        accounts: {
          config,
          round,
          userBet,
          user,
          treasury,
          systemProgram: PublicKey.default,
        },
      });

      alert(`Rewards claimed for round ${roundId}`);
      setClaimableRewards(0);
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      alert("Failed to claim rewards");
    }
  };

  const getSlidesPerView = () => {
    if (!mounted) return 1;
    if (screenWidth < 640) return 1;
    if (screenWidth < 1024) return 2;
    return 3;
  };

  const formatCardVariant = (round: Round, currentRoundNumber: number): "live" | "expired" | "next" | "later" | "locked" => {
    const roundNumber = Number(round.number);
    if (roundNumber === currentRoundNumber) {
      return timeLeft !== null && timeLeft > 0 && !isLocked ? "live" : "locked";
    }
    if (roundNumber === currentRoundNumber + 1) {
      return "next";
    }
    if (roundNumber > currentRoundNumber + 1) {
      return "later";
    }
    return "expired";
  };

  const handleSlideChange = () => {
    if (!swiperRef.current) return;
    const swiper = swiperRef.current;
    if (swiper.activeIndex >= rounds.length - 2 && rounds.length < totalPreviousRounds) {
      fetchMoreRounds();
    }
  };

  // Construct rounds array
  const rounds = [
    ...(currentRound ? [currentRound] : []),
    ...(Array.isArray(previousRounds)
      ? previousRounds
        .filter((round) => {
          const roundNumber = Number(round.number);
          return roundNumber <= (Number(currentRound?.number) || Number(config?.currentRound) || 0) - 1 &&
            roundNumber > (Number(currentRound?.number) || Number(config?.currentRound) || 0) - 6;
        })
        .slice(0, 5)
      : []),
    ...(currentRound && config?.currentRound && config?.roundDuration
      ? [{
        id: (currentRound.id || 0) + 1,
        number: Number(currentRound.number) + 1,
        startTime: new Date(
          Number(currentRound.startTime) * 1000 + (config.roundDuration * 1000)
        ),
        status: "ended" as const,
        isActive: false,
        lockTime: currentRound.closeTime,
        closeTime: currentRound.closeTime ? currentRound.closeTime + (config.lockDuration || 150) : undefined,
      }]
      : []),
  ];

  // Deduplicate rounds, preserving currentRound
  const roundMap = new Map<number, Round>();
  rounds.forEach((round) => {
    const roundNumber = Number(round.number);
    // Prioritize currentRound if it matches
    if (!roundMap.has(roundNumber) || (currentRound && roundNumber === Number(currentRound.number))) {
      roundMap.set(roundNumber, round);
    }
  });
  const uniqueRounds = Array.from(roundMap.values()).sort((a, b) => Number(b.number) - Number(a.number));

  // // Log rounds for debugging
  // useEffect(() => {
  //   console.log("Rounds:", rounds.map(r => Number(r.number)));
  //   console.log("Unique Rounds:", uniqueRounds.map(r => Number(r.number)));
  // }, [rounds, uniqueRounds]);

  // Format timeLeft as MM:SS
  const formatTimeLeft = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "Locked";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loader border-4 border-t-4 border-gray-200 rounded-full w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-5 md:mt-6 lg:mt-[70px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
        <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
          <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
            <div className="flex justify-between items-center flex-wrap gap-2 md:gap-4">
              <div className="relative">
                <Image
                  className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                  src="/assets/solana_logo.png"
                  alt="Solana"
                  width={64}
                  height={64}
                />
                <div className="glass flex gap-2 sm:gap-[9px] lg:gap-[26px] relative top-0 left-[8px] sm:left-[10px] lg:left:[20px] items-center font-semibold px-3 sm:px-[20px] lg:px-[44px] py-1 sm:py-[6px] lg:py-[15px] rounded-full">
                  <p className="text-[10px] sm:text-[12px] lg:text-[20px]">SOL/USDT</p>
                  <p className="text-[10px] sm:text-[12px]">${liveRoundPrice.toFixed(2)}</p>
                </div>
              </div>
              <div className="glass py-1 sm:py-[6px] lg:py-[15px] px-3 sm:px-[24px] rounded-full w-[90px] sm:w-[104px] lg:w-[210px] relative">
                <p className="flex items-center font-semibold text-[10px] sm:text-[12px] lg:text-[20px] gap-1 sm:gap-[7px]">
                  <span>Time</span>
                  <span className="text-[6px] sm:text-[8px] lg:text-[12px]">
                    {formatTimeLeft(timeLeft)}
                  </span>
                </p>
                <div className="hidden w-[64px] h-[64px] glass absolute rounded-full right-[24px] top-[-2px] lg:flex items-center justify-center backdrop-blur-2xl">
                  <SVG width={40} height={40} iconName="clock" />
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
                {claimableRewards > 0 && (
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
                        <span>{claimableRewards.toFixed(4)} SOL</span>
                      </div>
                    </div>
                    <button
                      className="glass bg-green-500 py-2 px-4 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                      onClick={() => handleClaimRewards(currentRound?.number || 0)}
                      disabled={!claimableRewards}
                    >
                      Claim
                    </button>
                  </div>
                )}
              </div>
            )}

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
                pagination={{
                  clickable: true,
                  dynamicBullets: mounted && screenWidth < 640,
                  el: ".swiper-pagination",
                }}
                modules={[EffectCoverflow, Pagination]}
                className="w-full px-4 sm:px-0"
              >
                {uniqueRounds.map((round) => {
                  const roundNumber = Number(round.number);
                  const startTimeMs = typeof round.startTime === "string" && !isNaN(Number(round.startTime))
                    ? Number(round.startTime) * 1000
                    : new Date(round.startTime).getTime();
                  const lockTime = round.lockTime || startTimeMs / 1000 + 300;
                  const closeTime = round.closeTime || lockTime + 150;
                  return (
                    <SwiperSlide key={Number(round.number)} className="flex justify-center items-center">
                      <PredictionCard
                        variant={formatCardVariant(round, Number(config?.currentRound) || 0)}
                        roundId={Number(round.number)}
                        roundData={{
                          lockPrice: (round.lockPrice || 50 * 1e8) / 1e8,
                          closePrice: round.endPrice ? round.endPrice / 1e8 : liveRoundPrice,
                          currentPrice: liveRoundPrice || (round.lockPrice || 50 * 1e8) / 1e8,
                          prizePool: (round.totalAmount || 0) / LAMPORTS_PER_SOL,
                          upBets: (round.totalBullAmount || 0) / LAMPORTS_PER_SOL,
                          downBets: (round.totalBearAmount || 0) / LAMPORTS_PER_SOL,
                          timeRemaining: Math.max(0, closeTime - Date.now() / 1000),
                          lockTimeRemaining: timeLeft !== null ? timeLeft : Math.max(0, lockTime - Date.now() / 1000),
                          status: roundNumber === Number(config?.currentRound) && timeLeft !== null && timeLeft > 0 && !isLocked
                            ? "LIVE"
                            : roundNumber === Number(config?.currentRound) && isLocked
                              ? "LOCKED"
                              : "ENDED",
                        }}
                        onPlaceBet={handlePlaceBet}
                        currentRoundId={Number(config?.currentRound)}
                        bufferTimeInSeconds={config?.bufferSeconds || 30}
                        liveRoundPrice={liveRoundPrice}
                        userBets={userBets}
                        isLocked={isLocked}
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

            {/* {connected && userBets.length > 0 && <BetsHistory userBets={userBets} />} */}
          </div>

          <LiveBets liveBets={[]} />
        </div>
      </div>
    </QueryClientProvider>
  );
}
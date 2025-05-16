/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
"use client";

import { useRef, useState, useEffect } from "react";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { MobileLiveBets } from "./MobileBets";
import LiveBets from "./LiveBets";
import { useRoundManager } from "@/hooks/roundManager";
import { Round, UserBet } from "@/types/round";
import { useRound } from "@/hooks/useConfig";
import { useSolPredictor } from "@/hooks/useBuyClaim"
import { BetsHistory } from "./BetsHistory";
import LineChart from "./LineChart";
import { fetchLivePrice } from '@/lib/price-utils';





export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<any>(null);
  const { publicKey, connected } = useWallet();
  const connectionRef = useRef<Connection | null>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [liveRoundPrice, setLiveRoundPrice] = useState(50.5);
  const [claimableRewards, setClaimableRewards] = useState(0);
  const { handlePlaceBet, handleClaimPayout, claimableBets } = useSolPredictor();

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

  // Calculate total claimable amount
  const claimableAmount = claimableBets.reduce((sum, bet) => sum + bet.payout, 0);

   // Fetch live price periodically
   useEffect(() => {
    const updateLivePrice = async () => {
      const price = await fetchLivePrice();
      setLiveRoundPrice(price);
    };

    updateLivePrice(); // Initial fetch
    const interval = setInterval(updateLivePrice, 10000); // Update every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);


  // Fetch next round
  const nextRoundNumber = currentRound ? Number(currentRound.number) + 1 : undefined;
  const { data: nextRound, isLoading: isNextRoundLoading } = useRound(nextRoundNumber);

  // console.log('previous rounds : ',previousRounds.length);



  useEffect(() => {
    connectionRef.current = new Connection("https://lb.drpc.org/ogrpc?network=solana-devnet&dkey=AqnRwY5nD0C_uEv_hPfBwlLj0fFzMcQR8JKdzoXPVSjK", {
      commitment: "finalized",
      wsEndpoint: undefined,
    });

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
        { roundId: 1000, direction: "up", status: "WON", amount: 0.5, payout: 0.1 },
        { roundId: 2000, direction: "down", status: "LOST", amount: 0.3, payout: 0 },
      ];
      setUserBets(mockBets);
    };

    // const fetchClaimableRewards = async () => {
    //   setClaimableRewards(0);
    // };

    fetchBalance();
    fetchUserBets();
    // fetchClaimableRewards();
  }, [connected, publicKey, currentRound?.number]);




  const handleBet = async (direction: "up" | "down", amount: number, roundId: number) => {
    if (!connected || !publicKey || !connectionRef.current) {
      alert("Please connect your wallet");
      return;
    }

    try {

      await handlePlaceBet(roundId, direction === "up", amount)
      alert(`Bet placed: ${amount} SOL ${direction} on round ${roundId}`);
    } catch (error) {
      console.error("Failed to place bet:", error);
      alert("Failed to place bet");
    }
  };



  const handleClaimRewards = async (roundId: number) => {
    if (!connected || !publicKey || !connectionRef.current) {
      alert("Please connect your wallet");
      return;
    }

    try {

      await handleClaimPayout(roundId)
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

  const formatCardVariant = (round: Round, currentRoundNumber: number): "next" | "expired" | "later" | "locked" | "live" => {
    const roundNumber = Number(round.number);
    if (roundNumber === currentRoundNumber) {
      return round.isActive && timeLeft !== null && timeLeft > 0 && !isLocked ? "next" : "locked";
    }
    if (roundNumber === currentRoundNumber - 1) {
      return isLocked ? "live" : "live";
    }
    if (roundNumber === currentRoundNumber + 1) {
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

  const currentRoundNumber = Number(config?.currentRound) || Number(currentRound?.number) || 1000;

  const rounds = [
    ...(currentRound && !isNaN(Number(currentRound.number)) && Number(currentRound.number) > 0 ? [currentRound] : []),
    ...(previousRounds && Array.isArray(previousRounds)
      ? previousRounds.filter(
        (round) => !isNaN(Number(round.number)) && Number(round.number) > 0 && Number(round.number) <= currentRoundNumber - 1
      )
      : []),
  ];




  // console.log(rounds.length);

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



  const uniqueRounds = Array.from(roundMap.values()).sort((a, b) => Number(b.number) - Number(a.number));
  // console.log(uniqueRounds.length);


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
              {claimableAmount > 0 && (
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
                    onClick={() => {
                      claimableBets.forEach((bet: { roundNumber: number; }) => handleClaimRewards(bet.roundNumber));
                    }}
                    disabled={claimableAmount === 0}
                  >
                    Claim
                  </button>
                </div>
              )}
            </div>
          )}

          {isLocked && currentRound?.number !== config?.currentRound && (
            <div className="text-center py-3 font-semibold">Waiting for new round...</div>
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
              modules={[Pagination,]}
              className="w-full px-4 sm:px-0"
            >
              {uniqueRounds.map((round) => {
                const roundNumber = Number(round.number);
                const startTimeMs =
                  typeof round.startTime === 'number' && !isNaN(round.startTime)
                    ? round.startTime * 1000
                    : round.startTime instanceof Date
                      ? round.startTime.getTime()
                      : 0;
                const lockTime =
                  (round.lockTime) instanceof Date
                    ? round.lockTime.getTime() / 1000
                    : typeof round.lockTime === 'string' && !isNaN(Number(round.lockTime))
                      ? Number(round.lockTime)
                      : startTimeMs / 1000 + 120;
                const closeTime =
                  round.closeTime instanceof Date
                    ? round.closeTime.getTime() / 1000
                    : typeof round.closeTime === 'string' && !isNaN(Number(round.closeTime))
                      ? Number(round.closeTime)
                      : lockTime + 120;
                //const claimableForRound = claimableBets.find((bet) => bet.roundNumber === roundNumber);
                return (
                  <SwiperSlide key={Number(round.number)} className="flex justify-center items-center">
                    <PredictionCard
                      variant={formatCardVariant(round, currentRoundNumber)}
                      roundId={Number(round.number)}
                      roundData={{
                        lockPrice: (round.lockPrice!) / 1e8,
                        closePrice: round.endPrice ? round.endPrice / 1e8 : liveRoundPrice,
                        currentPrice: liveRoundPrice || (round.lockPrice || 50 * 1e8) / 1e8,
                        prizePool: (round.totalAmount || 0) / LAMPORTS_PER_SOL,
                        upBets: (round.totalBullAmount || 0) / LAMPORTS_PER_SOL,
                        downBets: (round.totalBearAmount || 0) / LAMPORTS_PER_SOL,
                        timeRemaining: Math.max(0, closeTime - Date.now() / 1000),
                        lockTimeRemaining: timeLeft !== null && roundNumber === Number(config?.currentRound) ? timeLeft : Math.max(0, lockTime - Date.now() / 1000),
                        lockTime: timeLeft !== null && roundNumber === Number(config?.currentRound) ? Date.now() / 1000 + timeLeft : lockTime,
                        closeTime,
                        isActive: round.isActive ? true : false
                      }}
                      onPlaceBet={handleBet}
                      currentRoundId={Number(config?.currentRound)}
                      bufferTimeInSeconds={(config?.bufferSeconds! - 10) || 30}
                      liveRoundPrice={liveRoundPrice}
                      userBets={userBets}
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

          {connected && userBets.length > 0 && <BetsHistory userBets={userBets} />}
        </div>

        <LiveBets liveBets={[]} />
        <LineChart />
      </div>
    </div>

  );
}
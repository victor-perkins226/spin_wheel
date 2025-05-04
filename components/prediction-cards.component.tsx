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
import LineChart from "./LineChart";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { MobileLiveBets } from "./MobileBets";
import { BetsHistory } from "./BetsHistory";
import LiveBets from "./LiveBets";
import { useRoundManager } from "@/lib/round-manager";

// Contract address
const PREDICTION_CONTRACT = "HwosxPfiLetgxCVDnCdi1LB4vnbLHPfSjxkgKxsMykzw";

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef(null);
  const { publicKey, connected, signTransaction } = useWallet();
  const connectionRef = useRef(null);

  // Initialize connection
  useEffect(() => {
    // Initialize Solana connection
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    connectionRef.current = connection;

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

  // Use our custom round manager hook
  // Use our custom round manager hook
  const {
    rounds,
    currentPrice,
    historicalPrices,
    liveBets,
    userBets,
    userBalance,
    claimableRewards,
    isProcessingAction,
    placeBet: handlePlaceBet,
    claimRewards: handleClaimRewards,
    getActiveRoundId,
  } = useRoundManager({
    wallet: { publicKey, connected },
    signTransaction,
    connection: connectionRef.current,
    contractAddress: PREDICTION_CONTRACT,
  });

  const formatCardVariant = (round) => {
    return round.variant;
  };

  const getSlidesPerView = () => {
    if (!mounted) return 1;
    if (screenWidth < 640) return 1;
    if (screenWidth < 1024) return 2;
    return 3;
  };

  // Get the active round ID for determining which rounds can be bet on
  const activeRoundId = getActiveRoundId();

  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-5 md:mt-6 lg:mt-[70px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
        <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-2 md:gap-4">
            <div className="relative">
              <Image
                className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                src="/assets/solana_logo.png"
                alt="Solana"
                width={64}
                height={64}
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
              {/* Display countdown for live round */}
              {rounds.length > 0 && rounds.some((r) => r.status === "LIVE") && (
                <p className="flex items-center font-semibold text-[10px] sm:text-[12px] lg:text-[20px] gap-1 sm:gap-[7px]">
                  {Math.floor(
                    rounds.find((r) => r.status === "LIVE").timeRemaining / 60
                  )}
                  :
                  {(Math.floor(
                    rounds.find((r) => r.status === "LIVE").timeRemaining % 60
                  ) < 10
                    ? "0"
                    : "") +
                    Math.floor(
                      rounds.find((r) => r.status === "LIVE").timeRemaining % 60
                    )}
                  <span className="text-[6px] sm:text-[8px] lg:text-[12px]">
                    Live
                  </span>
                </p>
              )}
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
                    currentRoundId={activeRoundId}
                    bufferTimeInSeconds={30}
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
            <BetsHistory userBets={userBets} />
          )}
        </div>

        {/* Live Bets Sidebar */}

        <LiveBets liveBets={liveBets} />
      </div>
    </div>
  );
}

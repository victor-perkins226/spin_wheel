"use client";

import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useTheme } from "next-themes";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";
import type SwiperCore from "swiper";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import LineChart from "./LineChart";

const MobileLiveBets = () => {
  return (
    <div className="w-full glass px-3 py-4 rounded-lg mt-2">
      <h3 className="font-semibold text-base mb-3">Live Bets</h3>
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-2 text-xs">User</th>
              <th className="pb-2 text-xs">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, key) => (
              <tr key={key} className="font-semibold text-xs">
                <td className="py-2">
                  <div className="flex gap-1 items-center">
                    <SVG width={20} height={20} iconName="avatar" />
                    John Doe
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    <Image
                      className="w-[20px] h-auto object-contain"
                      src={SolanaLogo}
                      alt=""
                    />
                    0.1 SOL
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<SwiperCore | null>(null);

  useEffect(() => {
    setMounted(true);
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };
    updateScreenWidth();
    window.addEventListener("resize", updateScreenWidth);
    return () => {
      window.removeEventListener("resize", updateScreenWidth);
      if (swiperRef.current && swiperRef.current.destroy) {
        swiperRef.current.destroy(true, true);
      }
    };
  }, []);

  const formatCardVariant = (index: number) => {
    switch (index) {
      case 1:
        return "expired";
      case 2:
        return "live";
      default:
        return "next";
    }
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
                <p className="text-[10px] sm:text-[12px]">$534.1229</p>
              </div>
            </div>

            <div className="glass py-1 sm:py-[6px] lg:py-[15px] px-3 sm:px-[24px] rounded-full w-[90px] sm:w-[104px] lg:w-[210px] relative">
              <p className="flex items-center font-semibold text-[10px] sm:text-[12px] lg:text-[20px] gap-1 sm:gap-[7px]">
                4:02{" "}
                <span className="text-[6px] sm:text-[8px] lg:text-[12px]">
                  5m
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
              {[1, 2, 3].map((card, key) => (
                <SwiperSlide
                  key={key}
                  className="flex justify-center items-center"
                >
                  <PredictionCard variant={formatCardVariant(card)} />
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="swiper-pagination !relative !mt-4" />
          </div>

          {/* Line Chart Component */}
          <div className="mt-10"> 
            <LineChart />
          </div>

          {/* Mobile-only Live Bets */}
          <div className="xl:hidden">
            <MobileLiveBets />
          </div>
        </div>

        {/* Live Bets Sidebar */}
        <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
          <div className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px]">
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
                {[...Array(15)].map((_, key) => (
                  <tr key={key} className="font-semibold text-[15px]">
                    <td className="py-3">
                      <div className="flex gap-[6px] items-center">
                        <SVG width={29} height={29} iconName="avatar" />
                        John Doe
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Image
                          className="w-[30px] h-auto object-contain"
                          src={SolanaLogo}
                          alt=""
                        />
                        0.1 SOL
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

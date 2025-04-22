"use client";

import React from "react";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

export default function PredictionCards() {
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

  return (
    <div className="container mt-[40px] flex flex-col gap-[40px]">
      <div className="grid grid-cols-12 xl:gap-[40px]">
        <div className="flex flex-col gap-[53px] col-span-12 xl:col-span-9">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="relative">
              <Image
                className="w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                src={SolanaLogo}
                alt=""
              />
              <div className="glass flex gap-[9px] lg:gap-[26px] relative top-0 left-[10px] lg:left-[20px] items-center font-semibold px-[20px] lg:px-[44px] py-[6px] lg:py-[15px] rounded-[50px]">
                <p className="text-[12px] lg:text-[20px]">SOL/USDT</p>
                <p className="text-[12px]">$534.1229</p>
              </div>
            </div>

            <div className="glass py-[6px] lg:py-[15px] px-[24px] rounded-[40px] w-[104px] lg:w-[210px] relative">
              <p className="flex items-center font-semibold text-[12px] lg:text-[20px] gap-[7px]">
                4:02 <span className="text-[8px] lg:text-[12px]">5m</span>
              </p>
              <div className="hidden w-[64px] h-[64px] glass absolute rounded-full right-[24px] top-[-2px] lg:flex items-center justify-center backdrop-blur-2xl">
                <SVG width={40} height={40} iconName="clock" />
              </div>
              <div className="lg:hidden w-[33px] h-[33px] glass absolute rounded-full right-[0px] top-[-2px] flex items-center justify-center backdrop-blur-2xl">
                <SVG width={18} height={18} iconName="clock" />
              </div>
            </div>
          </div>

          {/* Swiper Slider */}
          <Swiper
            effect="coverflow"
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={2}
            coverflowEffect={{
              rotate: 50,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            }}
            pagination={{ clickable: true }}
            modules={[EffectCoverflow, Pagination]}
            breakpoints={{
              768: {
                slidesPerView: 1,
              },
              1024: {
                slidesPerView: 3,
              },
            }}
            className="w-full"
          >
            {[1, 2, 3].map((card, key) => (
              <SwiperSlide key={key} className="flex justify-center">
                <PredictionCard variant={formatCardVariant(card)} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Live Bets Sidebar */}
        <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
          <div className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px]">
            Live Bets
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
                {[...Array(20)].map((_, key) => (
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

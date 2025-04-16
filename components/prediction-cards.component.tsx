import React from "react";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";

export default function PredictionCards() {
  const formatCardVariant = (index: number) => {
    switch (index) {
      case 1:
        return "expired";
      case 2:
        return "live";
      case 3:
        return "next";
      default:
        return "later";
    }
  };

  return (
    <div className="container mt-[40px] mb-[286px] flex flex-col gap-[40px]">
      <div className="flex gap-[53px] items-center justify-center">
        <div className="glass p-4 rounded-[20px]">
          <SVG iconName="caret-left" height={24} width={14} />
        </div>

        <div className="glass p-4 rounded-[20px]">
          <SVG iconName="caret-right" height={24} width={14} />
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="relative">
          <Image
            className="w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
            src={SolanaLogo}
            alt=""
          />

          <div className="glass flex gap-[26px] relative top-0 left-[20px] items-center font-semibold px-[44px] py-[15px] rounded-[50px]">
            <p className="text-[20px]">SOL/USDT</p>

            <p className="text-[12px]">$534.1229</p>
          </div>
        </div>

        <div className="glass py-[15px] px-[24px] rounded-[40px] w-[210px] relative">
          <p className="flex items-center font-semibold text-[20px] gap-[7px]">
            4:02 <span className="text-[12px]">5m</span>
          </p>

          <div className="w-[64px] h-[64px] glass absolute rounded-full right-[24px] top-[-2px] flex items-center justify-center backdrop-blur-2xl">
            <SVG width={40} height={40} iconName="clock" />
          </div>
        </div>
      </div>

      <div className="flex gap-[59px] justify-between overflow-auto">
        {[1, 2, 3, 4].map((card, key) => (
          <PredictionCard variant={formatCardVariant(card)} key={key} />
        ))}
      </div>
    </div>
  );
}

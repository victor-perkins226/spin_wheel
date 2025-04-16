import React from "react";
import Button from "./button.component";
import SVG from "./svg.component";
import Image from "next/image";
import SolanaBg from "@/public/assets/solana_bg.png";

export default function PredictionCard() {
  return (
    <div className="glass flex flex-col justify-between gap-[10px] p-[25px] rounded-[20px] min-w-[285px]">
      <div className="flex justify-between font-semibold text-[20px]">
        <div className="flex items-center gap-[10px]">
          <SVG width={12} height={12} iconName="play-fill" />
          <p>Expired</p>
        </div>

        <p>#366520</p>
      </div>

      <Button
        style={{
          background: "linear-gradient(90deg, #06C729 0%, #04801B 100%)",
        }}
        className="flex flex-col gap-4 py-[16px]"
      >
        <p className="text-[20px] font-[600] leading-0">UP</p>
        <p className="text-[10px] font-[600] leading-0">2.51x payout</p>
      </Button>

      <div className="flex-1 flex flex-col glass gap-[33px] p-[10px] rounded-[20px] justify-between">
        <Image
          alt=""
          src={SolanaBg}
          className="w-full rounded-[20px] flex-1 object-cover"
        />

        <div className="flex flex-col gap-[22px] font-semibold text-[#FEFEFE]">
          <div className="flex justify-between">
            <p className="text-[20px]">$585.1229</p>

            <div className="bg-white flex items-center gap-[4px] text-[#1F1F43] px-[10px] py-[5px] rounded-[5px]">
              <SVG width={8} height={8} iconName="arrow-up" />
              <p className="text-[10px]">$0.0001</p>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <p>Locked Price</p>

            <p>$584.1229</p>
          </div>

          <div className="flex justify-between text-[16px]">
            <p>Prize Pool</p>

            <p>8.6015 BNB</p>
          </div>
        </div>
      </div>

      <Button
        style={{
          background: "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)",
        }}
        className="flex flex-col gap-4 py-[16px]"
      >
        <p className="text-[20px] font-[600] leading-0">DOWN</p>
        <p className="text-[10px] font-[600] leading-0">2.51x payout</p>
      </Button>
    </div>
  );
}

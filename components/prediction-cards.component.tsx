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
      default:
        return "next";
    }
  };

  return (
    <div className="container mt-[40px] flex flex-col gap-[40px]">
      <div className="hidden xl:flex gap-[53px] items-center justify-center">
        <div className="glass p-4 rounded-[20px]">
          <SVG iconName="caret-left" height={24} width={14} />
        </div>

        <div className="glass p-4 rounded-[20px]">
          <SVG iconName="caret-right" height={24} width={14} />
        </div>
      </div>

      <div className="grid grid-cols-12 xl:gap-[40px]">
        <div className="flex flex-col gap-[53px] col-span-12 xl:col-span-9">
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

          <div className="flex gap-[36px] justify-between overflow-auto">
            {[1, 2, 3].map((card, key) => (
              <PredictionCard variant={formatCardVariant(card)} key={key} />
            ))}
          </div>
        </div>

        <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
          <div className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px]">
            Live Bets
          </div>

          <div className="glass px-[30px] py-[16px] rounded-[20px] w-full">
            <table className="w-full text-left">
              <thead className="mb-[25px]">
                <tr className="mb-[25px]">
                  <th className="pb-[24px]">User</th>
                  <th className="pb-[24px]">Amount</th>
                </tr>
              </thead>

              <tbody>
                {[
                  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                  19, 20,
                ].map((el, key) => (
                  <tr key={key} className="font-semibold text-[15px]">
                    <td className="py-3">
                      <div className="flex gap-[6px] items-center">
                        {" "}
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

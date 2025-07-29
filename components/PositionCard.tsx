// components/PositionCard.tsx
import React from "react";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import medalGold from "@/public/assets/gold.png";
import medalSilver from "@/public/assets/silver.png";
import medalBronze from "@/public/assets/bronze.png";
import { formatNum } from "@/lib/utils";
import { useLivePrice } from "@/lib/price-utils";
import { PuffLoader } from "react-spinners";
import { useTheme } from "next-themes";

export interface Leader {
  userWalletAddress: string;
  netWinning: number;
  winRate: number;
  roundsWon: number;
  roundsPlayed: number;
}

interface PositionCardProps {
  position: 1 | 2 | 3;
  leader: Leader;
}

const medalMap = {
  1: medalGold,
  2: medalSilver,
  3: medalBronze,
};

const PositionCard: React.FC<PositionCardProps> = ({ position, leader }) => {
  const shortAddr = `${leader.userWalletAddress.slice(
    0,
    4
  )}…${leader.userWalletAddress.slice(-4)}`;
  const {
    price: livePrice,
    isLoading: priceLoading,
    error: priceError,
  } = useLivePrice();
  const { theme } = useTheme();
  return (
    <div className="glass p-6 rounded-2xl flex flex-col  max-w-[390px] w-full">
      <div className="flex justify-between items-center">
        <Image
          src={medalMap[position]}
          alt={`#${position}`}
          width={64}
          height={78}
        />
        <h3 className="mt-2 font-bold text-2xl"> {shortAddr}</h3>
      </div>
      <div className="mt-4 space-y-6 text-sm">
        <div className="flex items-center justify-between ">
          <span>Win Rate: </span>
          <span className="font-bold">{formatNum(leader.winRate)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span>New Winnings (SOL) </span>
          <div className="flex flex-col">
            <span className="font-bold flex items-center gap-1">
              <Image
                src={SolanaLogo}
                alt={"solana-logo"}
                width={16}
                height={12}
              />{" "}
              {formatNum(leader.netWinning)} SOL
            </span>
            <span className="text-end text-gray-400 text-xs">
              {priceLoading ? (
                <PuffLoader
                  size={12}
                  color={theme === "dark" ? "#fff" : "#000"}
                />
              ) : priceError ? (
                "—"
              ) : (
                `$${formatNum(leader.netWinning * (livePrice || 0))}`
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span>Rounds Won </span>
          <span className="font-bold ">
            {leader.roundsWon}/{leader.roundsPlayed}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PositionCard;

// components/PositionCard.tsx
import React from "react";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import medalGold from "@/public/assets/gold.png";
import medalSilver from "@/public/assets/silver.png";
import medalBronze from "@/public/assets/bronze.png";
import { formatNum } from "@/lib/utils";

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
    6
  )}…${leader.userWalletAddress.slice(-4)}`;
  return (
    <div className="glass p-6 rounded-2xl flex flex-col  max-w-[390px] w-full">
      <div className="flex justify-between items-center">
        <Image
          src={medalMap[position]}
          alt={`#${position}`}
          width={64}
          height={78}
        />
        <h3 className="mt-2 font-bold text-2xl"> John Doe</h3>
      </div>
      <div className="mt-4 space-y-6 text-sm">
        
        <div className="flex items-center justify-between ">
          <span>Win Rate: </span>
          <span className="font-bold">{formatNum(leader.winRate)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span>New Winnings (SOL) </span>
          <div className="flex flex-col">
            <span className="font-bold ">+243.295942</span>
            <span className=" text-end  text-gray-400 text-xs">$400,000.34</span>
            </div>
        </div>
         <div className="flex items-center justify-between">
          <span>Rounds Won </span>
            <span className="font-bold ">40500/85,465</span>
        </div>
      
      </div>
    </div>
  );
};

export default PositionCard;

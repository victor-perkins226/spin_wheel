// components/PositionCard.tsx
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import medalGold from "@/public/assets/gold.png";
import medalSilver from "@/public/assets/silver.png";
import medalBronze from "@/public/assets/bronze.png";
import { formatNum } from "@/lib/utils";
import { useLivePrice } from "@/lib/price-utils";
import { PuffLoader } from "react-spinners";
import { useTheme } from "next-themes";
import UserStatsModal from "./UserStatsModal";
import { network } from "./wallet.provider.component";

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
  const { theme } = useTheme();
  const shortAddr = `${leader.userWalletAddress.slice(
    0,
    4
  )}…${leader.userWalletAddress.slice(-4)}`;
  const {
    price: livePrice,
    isLoading: priceLoading,
    error: priceError,
  } = useLivePrice();

  // dropdown + modal state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // close dropdown on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <>
      <div
        className={` 
           flex flex-col max-w-[390px] w-full p-6 rounded-2xl
          ${theme === "dark" ? "glass" : "bg-white"}
        `}
      >
        <div className="flex relative justify-between items-center">
          <Image
            src={medalMap[position]}
            alt={`#${position}`}
            width={64}
            height={78}
          />

          <div ref={dropdownRef} className="relative inline-block">
            <h3
              onClick={() => setDropdownOpen((o) => !o)}
              className="mt-2 relative font-bold text-2xl cursor-pointer hover:underline"
            >
              {shortAddr}
            </h3>

            {dropdownOpen && (
              <div
                className={`
                absolute right-0 top-[70%] mt-2 w-42 rounded-md shadow-lg z-20 p-2
                border ${
                  theme === "dark" ? "border-gray-700" : "border-gray-200"
                }
                ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
                    : "bg-white"
                }
              `}
              >
                <button
                  onClick={() => {
                    setModalOpen(true);
                    setDropdownOpen(false);
                  }}
                  className={`
                  block w-full text-left px-4 py-2 text-sm cursor-pointer rounded-md
                  ${
                    theme === "dark" ? "hover:bg-gray-500" : "hover:bg-gray-200"
                  }
                `}
                >
                  View Stats
                </button>
                <button
                  onClick={() =>
                    window.open(
                      `https://solscan.io/account/${leader.userWalletAddress}?cluster=${network}`,
                      "_blank"
                    )
                  }
                  className={`
                  block w-full text-left px-4 py-2 text-sm cursor-pointer rounded-md
                  ${
                    theme === "dark" ? "hover:bg-gray-500" : "hover:bg-gray-200"
                  }
                `}
                >
                  View on Explorer
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-6 text-sm">
          {/* Win Rate */}
          <div className="flex justify-between">
            <span>Win Rate:</span>
            <span className="font-bold">{formatNum(leader.winRate)}%</span>
          </div>
          {/* Net Winnings */}
          <div className="flex justify-between">
            <span>Net Winnings (SOL)</span>
            <div className="flex flex-col items-end">
              <span className="font-bold flex items-center gap-1">
                <Image src={SolanaLogo} alt="SOL" width={16} height={12} />
                {formatNum(leader.netWinning)} SOL
              </span>
              <span className="text-gray-400 text-xs">
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
          {/* Rounds Won */}
          <div className="flex justify-between">
            <span>Rounds Won</span>
            <span className="font-bold">
              {leader.roundsWon}/{leader.roundsPlayed}
            </span>
          </div>
        </div>
      </div>

      <UserStatsModal
        isOpen={modalOpen}
        address={leader.userWalletAddress}
        stats={{
          netWinning: leader.netWinning,
          winRate: leader.winRate,
          roundsWon: leader.roundsWon,
          roundsPlayed: leader.roundsPlayed,
        }}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default PositionCard;

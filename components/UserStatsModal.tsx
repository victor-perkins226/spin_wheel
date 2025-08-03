"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { PuffLoader } from "react-spinners";
import { formatNum } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { UserBet } from "@/types/round";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useLivePrice } from "@/lib/price-utils";
import { FaTimes } from "react-icons/fa";
import { network } from "./wallet.provider.component";
import SVG from "./svg.component";

interface Stats {
  netWinning: number;
  winRate: number;
  roundsWon: number;
  roundsPlayed: number;
}

interface Props {
  isOpen: boolean;
  address: string;
  stats: Stats;
  onClose: () => void;
}

export default function UserStatsModal({
  isOpen,
  address,
  stats,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(false);

  // Always call hooks in same order
  const {
    price: livePrice,
    isLoading: priceLoading,
    error: priceError,
  } = useLivePrice();

  // fetch last 5 bets when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    axios
      .get(`${API_URL}/user/bet-history/${address}`, {
        params: { limit: 5, offset: 0 },
      })
      .then((res) => {
        const api = res.data;
        const parsed: UserBet[] = api.data.map((b: any) => ({
          id: b.id,
          roundId: b.epoch,
          walletAddress: b.walletAddress,
          direction: b.direction.toLowerCase(),
          amount: parseFloat(b.amount) / LAMPORTS_PER_SOL,
          payout: parseFloat(b.payout) / LAMPORTS_PER_SOL,
          status: b.status.toUpperCase(),
          betTime: b.betTime,
          createdAt: b.createdAt,
        }));
        setBets(parsed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, address]);

  if (!isOpen) return null;

  const getTextGray = () =>
    theme === "dark" ? "text-gray-300" : "text-gray-600";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`relative w-[90%] max-w-lg p-6 rounded-2xl ${
          theme === "dark" ? "glass" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute cursor-pointer top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FaTimes className="size-6" />
        </button>

        {/* Header */}
        <div className="text-center flex gap-6 items-center mb-6">
          <SVG iconName="avatar" width={64} height={64} />
          <h2
            onClick={() =>
              window.open(
                `https://solscan.io/account/${address}?cluster=${network}`,
                "_blank"
              )
            }
            className="font-semibold text-lg cursor-pointer hover:underline"
          >
            {`${address.slice(0, 6)}…${address.slice(-4)}`}
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-4 text-left mb-6">
          <div>
            <div className="text-xs text-gray-500">Net Winnings</div>
            <div className="flex flex-col font-semibold">
              {formatNum(stats.netWinning)} SOL{" "}
              {priceLoading ? (
                <PuffLoader
                  size={12}
                  color={theme === "dark" ? "#fff" : "#000"}
                />
              ) : priceError ? (
                "—"
              ) : (
                <span className="text-xs text-gray-500">
                  {" "}
                  {formatNum(stats.netWinning * (livePrice || 0))}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Win Rate</div>
            <div className="font-semibold">{formatNum(stats.winRate)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Rounds Won</div>
            <div className="font-semibold">{stats.roundsWon}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Rounds Played</div>
            <div className="font-semibold">{stats.roundsPlayed}</div>
          </div>
        </div>

        {/* Last 5 Bets: Round, Prediction, Amount */}
        <div
          className={`rounded-lg p-4 shadow-sm ${
            theme === "dark" ? "glass" : "bg-white"
          }`}
        >
          {loading ? (
            <div className="flex justify-center">
              <PuffLoader
                size={24}
                color={theme === "dark" ? "#fff" : "#000"}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <h3 className="font-bold mb-3">Last 5 Bets</h3>
              <table className="w-full text-left">
                <thead
                  className={`text-xs font-medium uppercase ${getTextGray()}`}
                >
                  <tr>
                    <th className="pb-2 pr-4">Round</th>
                    <th className="pb-2 pr-4">Prediction</th>
                    <th className="pb-2 pr-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 text-center text-sm text-gray-500"
                      >
                        No recent bets.
                      </td>
                    </tr>
                  ) : (
                    bets.map((bet, idx) => {
                      const usdValue =
                        bet.status === "WON" || bet.status === "CLAIMED"
                          ? bet.payout * (livePrice || 0)
                          : bet.status === "LOST"
                          ? -bet.amount * (livePrice || 0)
                          : 0;
                      return (
                        <tr
                          key={bet.id}
                          className={`${
                            idx > 0 ? "border-t " : ""
                          } border-gray-200 dark:border-gray-700 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 transition-colors`}
                        >
                          <td className="py-2 font-mono">#{bet.roundId}</td>
                          <td className={`py-2`}>
                            <span
                              className={`font-semibold px-4 w-[80px] text-center
                               text-white ${
                                 bet.direction === "up"
                                   ? "bg-green-400"
                                   : "bg-red-500"
                               } rounded-full px-2 py-1 text-xs mr-2 inline-block
                              `}
                            >
                              {bet.direction.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2 flex flex-col font-mono">
                            <span className="">
                              {formatNum(bet.amount)} SOL
                            </span>
                            <span className="text-xs  text-gray-400">
                              {priceLoading ? "..." : `$${formatNum(usdValue)}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNum } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { UserBet } from "@/types/round";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PuffLoader } from "react-spinners";
import { FaTimes } from "react-icons/fa";

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

export default function UserStatsModal({ isOpen, address, stats, onClose }: Props) {
  const { theme } = useTheme();
  const [bets, setBets] = useState<UserBet[]>([]);
  const [loading, setLoading] = useState(false);

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

  const getBorderColor = () =>
    theme === "dark" ? "border-gray-700" : "border-gray-200";
  const getTextColor = () =>
    theme === "dark" ? "text-gray-300" : "text-gray-600";
  const getBackgroundColor = () =>
    theme === "dark" ? "bg-gray-900/50" : "bg-white/50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 "
      onClick={onClose}
    >
      <div
        className={`relative w-[90%] max-w-lg p-6 rounded-2xl ${theme === "dark" ? "glass" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          <FaTimes className="size-6"/>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2
            onClick={() =>
              window.open(`https://solscan.io/account/${address}`, "_blank")
            }
            className="font-semibold text-lg cursor-pointer hover:underline"
          >
            {`${address.slice(0, 6)}…${address.slice(-4)}`}
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 text-center mb-6">
          <div>
            <div className="text-sm text-gray-500">Net Winnings</div>
            <div className="font-semibold">{formatNum(stats.netWinning)} SOL</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Win Rate</div>
            <div className="font-semibold">{formatNum(stats.winRate)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Rounds Won</div>
            <div className="font-semibold">{stats.roundsWon}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Rounds Played</div>
            <div className="font-semibold">{stats.roundsPlayed}</div>
          </div>
        </div>

        {/* Last 5 Bets Table */}
        <div className={`${getBackgroundColor()} backdrop-blur-sm rounded-lg p-4 shadow-sm`}>          
          {loading ? (
            <div className="flex justify-center">
              <PuffLoader size={24} color={theme === "dark" ? "#fff" : "#000"} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <h3 className="font-bold mb-3">Last 5 Bets</h3>
              <table className="w-full text-left">
                <thead className={`text-xs font-medium uppercase ${getTextColor()}`}>                  
                  <tr>
                    <th className="pb-2 pr-4">Round</th>
                    <th className="pb-2 pr-4">Prediction</th>
                    <th className="pb-2 pr-4">Amount</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {bets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                        No recent bets.
                      </td>
                    </tr>
                  ) : (
                    bets.map((bet, idx) => {
                      const status = bet.status;
                      return (
                        <tr
                          key={bet.id}
                          className={`${idx > 0 ? `border-t ${getBorderColor()}` : ""} hover:bg-muted/10 transition-colors`}
                        >
                          <td className="py-2 font-mono">#{bet.roundId}</td>
                          <td className={`py-2 font-mono ${
                            bet.direction === "up" ?
                              theme === "dark" ? "text-green-300" : "text-green-400" :
                              theme === "dark" ? "text-red-300" : "text-red-400"
                          }`}>{bet.direction.toUpperCase()}</td>
                          <td className="py-2 font-mono">{formatNum(bet.amount)} SOL</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                              ${status === "PENDING" ? (
                                theme === "dark"
                                  ? "text-yellow-300 bg-yellow-300/10"
                                  : "text-yellow-400 bg-yellow-50"
                              ) : status === "WON" || status === "CLAIMED" ? (
                                theme === "dark"
                                  ? "text-green-300 bg-green-300/10"
                                  : "text-green-400 bg-green-50"
                              ) : (
                                theme === "dark"
                                  ? "text-red-300 bg-red-300/10"
                                  : "text-red-400 bg-red-50"
                              )}
                            `}>{status}</span>
                          </td>
                          <td className="py-2 font-mono">{[
                            "WON",
                            "CLAIMED"
                          ].includes(status) ? (
                            <span className={theme === "dark" ? "text-green-300" : "text-green-400"}>
                              +{formatNum(bet.payout)} SOL
                            </span>
                          ) : status === "LOST" ? (
                            <span className={theme === "dark" ? "text-red-300" : "text-red-400"}>
                              -{formatNum(bet.amount)} SOL
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}</td>
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

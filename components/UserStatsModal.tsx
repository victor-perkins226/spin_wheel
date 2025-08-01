// components/UserStatsModal.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { PuffLoader } from "react-spinners";
import { formatNum } from "@/lib/utils";
import { API_URL } from "@/lib/config";

type Bet = {
  round: number;
  direction: "UP" | "DOWN";
  winnings: number;
};

interface Props {
  isOpen: boolean;
  address: string;
  stats: {
    netWinning: number;
    winRate: number;
    roundsWon: number;
    roundsPlayed: number;
  };
  onClose: () => void;
}

export default function UserStatsModal({
  isOpen,
  address,
  stats,
  onClose,
}: Props) {
  const { theme } = useTheme();
  const [lastBets, setLastBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);

  // compute a short form of the address
  const shortAddr = `${address.slice(0, 6)}…${address.slice(-4)}`;

  // fetch last 5 bets when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    axios
      .get<Bet[]>(`${API_URL}/bets/history`, {
        params: { address, limit: 5 },
      })
      .then((res) => setLastBets(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, address]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`
          relative w-[90%] max-w-lg p-6 rounded-2xl
          ${theme === "dark" ? "glass" : "bg-white"}
          
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-6 text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          &times;
        </button>

        {/* Header with clickable shortAddr */}
        <div className="text-center mb-6">
          <h2
            onClick={() =>
              window.open(`https://solscan.io/account/${address}`, "_blank")
            }
            className="font-semibold text-lg break-all cursor-pointer hover:underline"
          >
            {shortAddr}
          </h2>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-4 text-center mb-6">
          <div>
            <div className="text-sm text-gray-500">Net Winnings</div>
            <div className="font-semibold">
              {formatNum(stats.netWinning)} SOL
            </div>
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

        {/* Last 5 Bets */}
        <div>
          <div className="font-medium mb-2">Last 5 Bets</div>
          {loading ? (
            <div className="flex justify-center">
              <PuffLoader size={24} />
            </div>
          ) : (
            <div className="space-y-2">
              {lastBets.map((bet) => (
                <div
                  key={bet.round}
                  className="flex justify-between items-center text-sm"
                >
                  <span>#{bet.round}</span>
                  <span
                    className={
                      bet.direction === "UP"
                        ? "inline-flex items-center text-green-500"
                        : "inline-flex items-center text-pink-500"
                    }
                  >
                    {bet.direction === "UP" ? "↑" : "↓"}{" "}
                    {formatNum(bet.winnings)}
                  </span>
                </div>
              ))}
              {lastBets.length === 0 && (
                <div className="text-gray-500 text-center text-sm">
                  No recent bets.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

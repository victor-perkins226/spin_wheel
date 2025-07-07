// components/BetsHistory.tsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useTheme } from "next-themes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNum } from "@/lib/utils";
import { useTranslation } from "next-i18next";
import { API_URL } from "@/lib/config";
import { UserBet } from "@/types/round";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import PuffLoader from "react-spinners/PuffLoader";

interface BetsHistoryProps {
  walletAddress: string;
  currentRound: number;
  needRefresh: boolean;
}

export default function BetsHistory({
  walletAddress,
  currentRound,
  needRefresh
}: BetsHistoryProps) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");

  // pagination
  const betsPerPage = 10;
  const [limit] = useState(betsPerPage);
  const [offset, setOffset] = useState(0);

  // API state
  const [bets, setBets] = useState<UserBet[]>([]);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(false);

  // derive pages
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/user/bet-history/${walletAddress}`,
        { params: { limit, offset } }
      );
      const api = res.data;
      const parsed: UserBet[] = api.data.map((b: any) => ({
        id: b.id,
        roundId: b.epoch,
        walletAddress: b.walletAddress,
        direction: b.direction,
        amount: parseFloat(b.amount) / LAMPORTS_PER_SOL,
        payout: parseFloat(b.payout) / LAMPORTS_PER_SOL,
        status: b.status.toUpperCase(),
        betTime: b.betTime,
        createdAt: b.createdAt,
      }));
      setBets(parsed);
      setTotal(api.total);
      setHasNext(api.hasNext);
      setHasPrevious(api.hasPrevious);
    } catch (err) {
      console.error("Failed to fetch bet history:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, limit, offset, currentRound]);

  // initial + offset changes
  useEffect(() => {
    fetchPage();
  }, [fetchPage, needRefresh, currentRound]);

  useEffect(() => {
    const handler = () => {
      setOffset(0);
      fetchPage();
    };
    window.addEventListener("betPlaced", handler);
    window.addEventListener("claimSuccess", handler);
    window.addEventListener("newRound", handler);
    return () => {
      window.removeEventListener("betPlaced", handler);
      window.removeEventListener("claimSuccess", handler);
      window.removeEventListener("newRound", handler);
    };
  }, [currentRound]);

  const handlePrevPage = () => {
    if (hasPrevious) setOffset((prev) => Math.max(prev - limit, 0));
  };
  const handleNextPage = () => {
    if (hasNext) setOffset((prev) => prev + limit);
  };

  // helpers
  const displayStatus = (bet: UserBet) =>
    bet.roundId >= currentRound - 1 ? "PENDING" : bet.status;

  const getStatusColor = (status: string) => {
    const base = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "PENDING":
        return `${base} ${
          theme === "dark"
            ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
            : "text-yellow-600 bg-yellow-50 border-yellow-200"
        }`;
      case "WON":
        return `${base} ${
          theme === "dark"
            ? "text-green-400 bg-green-400/10 border-green-400/20"
            : "text-green-600 bg-green-50 border-green-200"
        }`;
      case "LOST":
        return `${base} ${
          theme === "dark"
            ? "text-red-400 bg-red-400/10 border-red-400/20"
            : "text-red-600 bg-red-50 border-red-200"
        }`;
      case "CLAIMED":
        return `${base} ${
          theme === "dark"
            ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
            : "text-blue-600 bg-blue-50 border-blue-200"
        }`;
      default:
        return `${base} ${
          theme === "dark"
            ? "text-gray-400 bg-gray-400/10 border-gray-400/20"
            : "text-gray-600 bg-gray-50 border-gray-200"
        }`;
    }
  };

  const getDirectionColor = (dir: string) =>
    dir === "up"
      ? theme === "dark"
        ? "text-green-400"
        : "text-green-600"
      : theme === "dark"
      ? "text-red-400"
      : "text-red-600";

  const getBorderColor = () =>
    theme === "dark" ? "border-gray-700" : "border-gray-200";
  const getTextColor = () =>
    theme === "dark" ? "text-gray-300" : "text-gray-600";
  const getBackgroundColor = () =>
    theme === "dark" ? "bg-gray-900/50" : "bg-white/50";

  return (
    <div
      className={`${getBackgroundColor()} backdrop-blur-sm mt-12 rounded-xl p-6 shadow-sm`}
    >
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        {t("betsHistory.title")}
      </h2>
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left text-sm ${getTextColor()}`}>
                  <th className="pb-3 text-xs md:text-sm font-medium">
                    {t("betsHistory.round")}
                  </th>
                  <th className="pb-3 text-xs md:text-sm font-medium">
                    {t("betsHistory.prediction")}
                  </th>
                  <th className="pb-3 text-xs md:text-sm font-medium">
                    {t("betsHistory.amount")}
                  </th>
                  <th className="pb-3 text-xs md:text-sm font-medium">
                    {t("betsHistory.status")}
                  </th>
                  <th className="pb-3 text-xs md:text-sm font-medium">
                    {t("betsHistory.payout")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet, i) => {
                  const status = displayStatus(bet);
                  return (
                    <tr
                      key={bet.id}
                      className={`${getBorderColor()} ${
                        i > 0 ? "border-t" : ""
                      } hover:bg-muted/20 transition-colors`}
                    >
                      <td className="py-3 font-mono text-sm text-foreground">
                        #{bet.roundId}
                      </td>
                      <td
                        className={`py-3 font-semibold ${getDirectionColor(
                          bet.direction
                        )}`}
                      >
                        <div className="flex items-center text-xs md:text-[1rem] gap-1">
                          {bet.direction === "up" ? "↗" : "↘"}{" "}
                          {bet.direction.toUpperCase()}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-xs md:text-sm text-foreground">
                        {formatNum(bet.amount)} SOL
                      </td>
                      <td className="py-3">
                        <span className={getStatusColor(status)}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs md:text-sm text-foreground">
                        {["WON", "CLAIMED"].includes(status) ? (
                          <span
                            className={
                              theme === "dark"
                                ? "text-green-400"
                                : "text-green-600"
                            }
                          >
                            +{formatNum(bet.payout)} SOL
                          </span>
                        ) : status === "LOST" ? (
                          <span
                            className={
                              theme === "dark"
                                ? "text-red-400"
                                : "text-red-600"
                            }
                          >
                            -{formatNum(bet.amount)} SOL
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className={`flex items-center justify-between mt-4 pt-4 border-t ${getBorderColor()}`}
          >
            <div className="text-xs md:text-sm text-muted-foreground">
              {t("betsHistory.showing")} {offset + 1}-{offset + bets.length}{" "}
              {t("betsHistory.of")} {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={!hasPrevious}
                className={`p-2 rounded-md cursor-pointer ${
                  !hasPrevious
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-xs md:text-sm text-foreground">
                {t("betsHistory.page")} {currentPage} {t("betsHistory.of")}{" "}
                {totalPages}
              </div>
              <button
                onClick={handleNextPage}
                disabled={!hasNext}
                className={`p-2 rounded-md cursor-pointer ${
                  !hasNext
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      
    </div>
  );
}

// components/LiveBets.tsx
"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import SVG from "./svg.component";
import io from "socket.io-client";
import axios from "axios";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./Themetoggle";
import toast from "react-hot-toast";
import BigBet from "@/public/assets/Big-Bet.png";

// Define the Bet interface
interface Bet {
  user: string;
  amount: number;
  signature: string;
  timestamp: number;
  round_number: number;
}

// Backend API and WebSocket URLs
const API_URL =
  "https://sol-prediction-backend.onrender.com/bet-placed?limit=1000&offset=0";
const WS_URL = "https://sol-prediction-backend.onrender.com";
const BIG_BET_THRESHOLD = 1;

// Initialize WebSocket connection
const socket = io(WS_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

interface LiveBetsProps {
  currentRound: number | null; // Allow null for loading/undefined states
}

function LiveBets({ currentRound }: LiveBetsProps) {
  const { theme } = useTheme();
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [newBetSignatures, setNewBetSignatures] = useState<Set<string>>(
    new Set()
  );

  // Animation styles
  const animationStyles = `
    @keyframes slideDownFade {
      0% {
        opacity: 0;
        transform: translateY(-8px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch bets when currentRound changes
  useEffect(() => {
    if (currentRound === null) {
      setLiveBets([]);
      setIsLoading(false);
      return;
    }

    const fetchBets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLiveBets([]); // Clear bets on round change
        const response = await axios.get(API_URL);

        const bets: Bet[] = response.data
          .map((bet: any) => {
            if (!bet.data.round_number) {
              return null;
            }
            return {
              user: bet.data.user.slice(0, 8) + "...",
              amount: bet.data.amount / 1e9, // Convert lamports to SOL
              signature: bet.signature,
              timestamp: new Date(bet.timestamp).getTime(),
              round_number: bet.data.round_number,
            };
          })
          .filter((bet): bet is Bet => bet !== null)
          .filter((bet: Bet) => bet.round_number === currentRound) // Filter by current round
          .sort((a: Bet, b: Bet) => b.amount - a.amount) // Sort by amount descending
          .slice(0, 10); // Limit to 10 bets
        setLiveBets(bets);
        console.log(`Fetched bets for round ${currentRound}:`, bets);
      } catch (error) {
        console.error("Error fetching bets:", error);
        setError("Failed to load bets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBets();
  }, [currentRound]);

  // Listen for new bets via WebSocket
  useEffect(() => {
    if (currentRound === null) return;

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("newBetPlaced", (newBet: any) => {
      console.log("New bet received:", newBet);
      const formattedBet: Bet = {
        user: newBet.data.user.slice(0, 8) + "...",
        amount: newBet.data.amount / 1e9,
        signature: newBet.signature,
        timestamp: new Date(newBet.timestamp).getTime(),
        round_number: newBet.data.round_number,
      };

      // Only add bets for the current round
      if (formattedBet.round_number !== currentRound) {
        return;
      }

      if (formattedBet.amount > BIG_BET_THRESHOLD) {
        toast.custom(
          (t) => (
            <div
              className={`
                          w-full glass text-center h-[400px] max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
                          shadow-xl animate-toast-bounce ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
                          flex flex-col items-start p-4 pb-8 mt-16
                          ${
                            theme === "dark"
                              ? "bg-gray-800 text-white"
                              : "bg-white text-black"
                          }
                        `}
              style={{
                animation: t.visible
                  ? "fadeInDown 200ms ease-out forwards"
                  : "fadeOutUp 150ms ease-in forwards",
              }}
            >
              <div className="w-full animate-vibrate h-[280px] relative mb-4">
                <Image
                  src={BigBet}
                  alt="big bet"
                  fill
                  className="object-cover rounded-xl"
                />
              </div>

              <h3 className="font-bold text-2xl animate-toast-pulse  mb-2">
                Big Bet Notification
              </h3>

              <p className=" text-sm">
                {" "}
                {formattedBet.user} made a {formattedBet.amount.toFixed(2)} SOL
                bet
              </p>
            </div>
          ),
          {
            position: "top-center",
          }
        );
      }

      // Ins

      setLiveBets((prevBets) => {
        // Prevent duplicates by signature
        if (prevBets.some((bet) => bet.signature === formattedBet.signature)) {
          return prevBets;
        }

        // Mark this bet as new for animation
        setNewBetSignatures(
          (prev) => new Set(prev.add(formattedBet.signature))
        );

        const updatedBets = [formattedBet, ...prevBets]
          .sort((a, b) => b.amount - a.amount) // Sort by amount descending
          .slice(0, 10); // Limit to 10 bets
        return updatedBets;
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    socket.on("error", (error: any) => {
      console.error("WebSocket error:", error);
    });

    socket.on("reconnect_attempt", (attempt: number) => {
      console.log(`Reconnecting to WebSocket, attempt ${attempt}`);
    });

    // Cleanup on unmount
    return () => {
      socket.off("newBetPlaced");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("error");
      socket.off("reconnect_attempt");
    };
  }, [currentRound]);

  // Remove animation class after animation completes
  useEffect(() => {
    if (newBetSignatures.size > 0) {
      const timer = setTimeout(() => {
        setNewBetSignatures(new Set());
      }, 400); // Match the CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [newBetSignatures]);

  if (!mounted) {
    return null;
  }

  const getStateMessageStyle = () => {
    return `flex items-center justify-center h-32 text-center ${
      theme === "dark" ? "text-gray-400" : "text-gray-500"
    }`;
  };

  const getErrorStyle = () => {
    return theme === "dark" ? "text-red-400" : "text-red-500";
  };

  const getLoadingStyle = () => {
    return theme === "dark" ? "text-gray-300" : "text-gray-600";
  };

  const getTableHeaderStyle = () => {
    return `pb-[24px] font-semibold text-sm ${
      theme === "dark" ? "text-gray-300" : "text-gray-600"
    }`;
  };

  const getTableRowStyle = () => {
    return `font-semibold text-[15px] transition-colors ${
      theme === "dark"
        ? "hover:bg-white/5 text-foreground"
        : "hover:bg-gray-50 text-foreground"
    }`;
  };

  const getUserTextStyle = () => {
    return `font-mono text-sm ${
      theme === "dark" ? "text-gray-300" : "text-gray-600"
    }`;
  };

  const getAmountTextStyle = () => {
    return `font-mono text-sm font-semibold ${
      theme === "dark" ? "text-green-400" : "text-green-600"
    }`;
  };

  const getLeaderboardButtonStyle = () => {
    return `glass py-[15px] px-[24px] rounded-[20px] mt-4 font-semibold text-[20px] cursor-pointer transition-all duration-200 ${
      theme === "dark"
        ? "hover:bg-white/10 text-foreground"
        : "hover:bg-black/5 text-foreground shadow-sm"
    }`;
  };

  return (
    <>
      <style jsx>{animationStyles}</style>
      <div className="hidden mt-[3rem] xl:flex col-span-3 flex-col gap-[63px] items-end">
        {/* Theme Toggle Button */}
        <ThemeToggle />

        {/* Leaderboard Button */}
        <div
          className={getLeaderboardButtonStyle()}
          onClick={() => (window.location.href = "/leaderboard")}
        >
          <div className="flex  items-center gap-2">
            <SVG iconName="medal" width={20} height={20} />
            Leaderboard
          </div>
        </div>

        {/* Live Bets Container */}
        <div className="glass px-[30px] h-full max-h-[700px] py-[16px] rounded-[20px] w-full">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  theme === "dark" ? "bg-green-400" : "bg-green-500"
                } animate-pulse`}
              ></div>
              Live Bets
              {currentRound ? (
                <span
                  className={`text-sm font-normal ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Round #{currentRound}
                </span>
              ) : (
                ""
              )}
            </h3>
          </div>

          {/* Content */}
          {error ? (
            <div className={`${getStateMessageStyle()} ${getErrorStyle()}`}>
              <div>
                <div className="mt-2">{error}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className={`${getStateMessageStyle()} ${getLoadingStyle()}`}>
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                <div>Loading bets...</div>
              </div>
            </div>
          ) : currentRound === null ? (
            <div className={getStateMessageStyle()}>
              <div>
                <SVG iconName="clock" width={24} height={24} />
                <div className="mt-2">No active round</div>
              </div>
            </div>
          ) : liveBets.length === 0 ? (
            <div className={getStateMessageStyle()}>
              <div>
                <div className="mt-2">No bets yet </div>
                <div className="text-xs mt-1 opacity-60">
                  Be the first to place a prediction!
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[600px]">
              <table className="w-full text-left">
                <tbody>
                  {liveBets.map((bet, index) => (
                    <tr
                      key={bet.signature}
                      className={`${getTableRowStyle()} ${
                        index !== liveBets.length - 1
                          ? theme === "dark"
                            ? "border-b border-gray-700/50"
                            : "border-b border-gray-200/50"
                          : ""
                      } transition-all duration-400 ease-out ${
                        newBetSignatures.has(bet.signature)
                          ? "opacity-0 -translate-y-2"
                          : "opacity-100 translate-y-0"
                      }`}
                      style={{
                        animation: newBetSignatures.has(bet.signature)
                          ? "slideDownFade 0.4s ease-out forwards"
                          : undefined,
                      }}
                    >
                      <td className="py-3">
                        <div className="flex gap-[8px] items-center">
                          <div
                            className={`rounded-full p-1 ${
                              theme === "dark"
                                ? "bg-gray-700/50"
                                : "bg-gray-200/50"
                            }`}
                          >
                            <SVG width={24} height={24} iconName="avatar" />
                          </div>
                          <span className={getUserTextStyle()}>{bet.user}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`rounded-full p-1 ${
                              theme === "dark"
                                ? "bg-gray-700/30"
                                : "bg-gray-100"
                            }`}
                          >
                            <Image
                              className="w-[20px] h-auto object-contain"
                              src="/assets/solana_logo.png"
                              alt="Solana"
                              width={20}
                              height={20}
                            />
                          </div>
                          <span className={getAmountTextStyle()}>
                            {bet.amount.toFixed(2)} SOL
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Show total stats */}
              {liveBets.length > 0 && (
                <div
                  className={`mt-4 pt-3 border-t ${
                    theme === "dark"
                      ? "border-gray-700/50"
                      : "border-gray-200/50"
                  }`}
                >
                  <div className="flex justify-between text-xs">
                    <span
                      className={
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }
                    >
                      Total Volume
                    </span>
                    <span className={`font-semibold ${getAmountTextStyle()}`}>
                      {liveBets
                        .reduce((sum, bet) => sum + bet.amount, 0)
                        .toFixed(2)}{" "}
                      SOL
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default LiveBets;

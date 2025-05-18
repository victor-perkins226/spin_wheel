// components/LiveBets.jsx
"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import SVG from "./svg.component";
import io from "socket.io-client";
import axios from "axios";

// Define the Bet interface
interface Bet {
  user: string;
  amount: number;
  signature: string;
  timestamp: number; // Add timestamp for sorting
}

// Backend API and WebSocket URLs
const API_URL = "https://sol-prediction-backend.onrender.com/bet-placed?limit=1000&offset=0";
const WS_URL = "https://sol-prediction-backend.onrender.com";

// Initialize WebSocket connection
const socket = io(WS_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function LiveBets() {
  const [liveBets, setLiveBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial bets on mount
  useEffect(() => {
    const fetchBets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get(API_URL);
        const bets: Bet[] = response.data
          .map((bet: any) => ({
            user: bet.data.user.slice(0, 8) + "...",
            amount: bet.data.amount / 1e9,
            signature: bet.signature,
            timestamp: new Date(bet.timestamp).getTime(), // Convert ISO string to timestamp
          }))
          // Sort by timestamp descending (newest first)
          .sort((a, b) => b.timestamp - a.timestamp);
        setLiveBets(bets.slice(0, 10)); // Limit to 10 bets
      } catch (error) {
        console.error("Error fetching bets:", error);
        setError("Failed to load bets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBets();
  }, []);

  // Listen for new bets via WebSocket
  useEffect(() => {
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
      };
      setLiveBets((prevBets) => {
        // Prevent duplicates by signature
        if (prevBets.some((bet) => bet.signature === formattedBet.signature)) {
          return prevBets;
        }
        const updatedBets = [formattedBet, ...prevBets].slice(0, 10);
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
  }, []);

  return (
    <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
      <div
        className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px] cursor-pointer"
        onClick={() => (window.location.href = "/leaderboard")}
      >
        Leaderboard
      </div>
      <div className="glass px-[30px] py-[16px] rounded-[20px] w-full">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : isLoading ? (
          <div>Loading bets...</div>
        ) : liveBets.length === 0 ? (
          <div>No bets available</div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-[24px]">User</th>
                <th className="pb-[24px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {liveBets.map((bet) => (
                <tr key={bet.signature} className="font-semibold text-[15px]">
                  <td className="py-3">
                    <div className="flex gap-[6px] items-center">
                      <SVG width={29} height={29} iconName="avatar" />
                      {bet.user}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <Image
                        className="w-[30px] h-auto object-contain"
                        src="/assets/solana_logo.png"
                        alt="Solana"
                        width={30}
                        height={30}
                      />
                      {bet.amount.toFixed(2)} SOL
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LiveBets;
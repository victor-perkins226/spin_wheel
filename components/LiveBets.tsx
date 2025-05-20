// components/LiveBets.jsx
"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import SVG from "./svg.component";
import io from "socket.io-client";
import axios from "axios";

// Backend API and WebSocket URLs
const API_URL = "https://sol-prediction-backend.onrender.com/bet-placed?limit=1000&offset=0";
const WS_URL = "https://sol-prediction-backend.onrender.com";

// Initialize WebSocket connection
const socket = io(WS_URL, {
  transports: ["websocket"], // Ensure WebSocket transport
  reconnection: true, // Enable reconnection
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function LiveBets() {
  const [liveBets, setLiveBets] = useState([]);

  // Fetch initial bets on mount
  useEffect(() => {
    const fetchBets = async () => {
      try {
        const response = await axios.get(API_URL);
        const bets = response.data
          .map((bet) => ({
            user: bet.data.user.slice(0, 8) + "...", // Truncate public key
            amount: bet.data.amount / 1e9, // Convert lamports to SOL
          }))
          .reverse(); // Show newest bets first
        setLiveBets(bets.slice(0, 15)); // Limit to 10 bets
      } catch (error) {
        console.error("Error fetching bets:", error);
      }
    };

    fetchBets();
  }, []);

  // Listen for new bets via WebSocket
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("newBetPlaced", (newBet) => {
      console.log("New bet received:", newBet);
      const formattedBet = {
        user: newBet.data.user.slice(0, 8) + "...",
        amount: newBet.data.amount / 1e9,
      };
      setLiveBets((prevBets) => {
        const updatedBets = [formattedBet, ...prevBets].slice(0, 10); // Add new bet, keep 10
        return updatedBets;
      });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Cleanup on unmount
    return () => {
      socket.off("newBetPlaced");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("error");
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
      <div className="glass px-[30px] rounded-[20px] w-full min-h-[895px] relative"> {/* Fixed height container */}
        <div className="absolute top-12 left-0 right-0 px-[30px]"> {/* This wrapper moves the whole table down */}
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-[24px]">User</th>
                <th className="pb-[24px]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {liveBets.map((bet, index) => (
                <tr key={index} className="font-semibold text-[15px]">
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
        </div>
      </div>
    </div>
  );
}

export default LiveBets;
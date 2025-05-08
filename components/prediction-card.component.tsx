"use client";

import { useState, useEffect } from "react";
import Button from "./button.component";
import SVG from "./svg.component";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import SolanaBg from "@/public/assets/solana_bg.png";
import { useCountdownTimer } from "@/hooks/useCountdownTimer";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface IProps {
  variant?: "live" | "expired" | "next" | "later";
  roundId?: number;
  roundData?: {
    lockPrice?: number;
    currentPrice?: number;
    closePrice?: number;
    endTime?: number;
    prizePool?: number;
    timeRemaining?: number;
    upBets?: number;
    downBets?: number;
    upPayout?: number;
    downPayout?: number;
    status?: "LIVE" | "LOCKED" | "ENDED" | "UPCOMING" | "LATER";
  };
  onPlaceBet?: (
    direction: "up" | "down",
    amount: number,
    roundId: number
  ) => void;
  currentRoundId?: number;
  bufferTimeInSeconds?: number;
  isRoundBettable?: (roundId: number) => boolean;
  liveRoundPrice?: number;
  userBetDirection?: "up" | "down" | null;
  userBetStatus?: "WON" | "LOST" | "PENDING" | null;
}

const CUSTOM_INPUTS = [
  { label: "10%", value: 0.1 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Max", value: 1.0 },
];

export default function PredictionCard({
  variant = "live",
  roundId = 1,
  roundData:initialRoundData,
  onPlaceBet,
  currentRoundId,
  bufferTimeInSeconds = 30,
  isRoundBettable,
  liveRoundPrice,
  userBetDirection,
  userBetStatus
}: IProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"up" | "down" | "">("");
  const [amount, setAmount] = useState<number>(0.1);
  const [maxAmount, setMaxAmount] = useState<number>(10);
  const [canBet, setCanBet] = useState<boolean>(false);
  const { connected, publicKey } = useWallet();
  const { formattedTime } = useCountdownTimer();
  const [roundData, setRoundData] = useState(initialRoundData);
  const [isLoading, setIsLoading] = useState(false);
  const [prevRoundData, setPrevRoundData] = useState<any>(null);
  const [priceDifference, setPriceDifference] = useState<number>(0.0001);
  const [priceDirection, setPriceDirection] = useState<"up" | "down">("up");

  // Fetch round data from API
  useEffect(() => {
    const fetchRoundData = async () => {
      // Only fetch data for live or expired rounds
      if (variant !== "live" && variant !== "expired") {
        return;
      }
      
      setIsLoading(true);
      try {
        // Fetch current round data
        const response = await fetch(`https://sol-prediction-backend.onrender.com/round/${roundId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch round data");
        }
        
        const data = await response.json();
        
        // Fetch previous round data for comparison
        const prevRoundId = roundId - 1;
        if (prevRoundId > 0) {
          const prevResponse = await fetch(`https://sol-prediction-backend.onrender.com/round/${prevRoundId}`);
          if (prevResponse.ok) {
            const prevData = await prevResponse.json();
            setPrevRoundData(prevData);
            
            // Calculate price difference between rounds
            const currentEndPrice = Number(data.endPrice);
            const prevEndPrice = Number(prevData.endPrice);
            const diff = Math.abs(currentEndPrice - prevEndPrice);
            setPriceDifference(diff);
            setPriceDirection(currentEndPrice >= prevEndPrice ? "up" : "down");
          }
        }
        
        // Convert and format the data
        const formattedData = {
          ...roundData,
          lockPrice: Number(data.lockPrice),
          closePrice: Number(data.endPrice),
          currentPrice: liveRoundPrice || Number(data.lockPrice),
          prizePool: Number(data.totalAmount) / LAMPORTS_PER_SOL,
          upBets: Number(data.totalBullAmount) / LAMPORTS_PER_SOL,
          downBets: Number(data.totalBearAmount) / LAMPORTS_PER_SOL,
          // Calculate payouts based on bet amounts if needed
          upPayout: calculatePayout("up", Number(data.totalBullAmount), Number(data.totalAmount)),
          downPayout: calculatePayout("down", Number(data.totalBearAmount), Number(data.totalAmount))
        };
        
        setRoundData(formattedData);
      } catch (error) {
        console.error("Error fetching round data:", error);
        // Keep using the initial data if API call fails
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRoundData();
  }, [variant, roundId, liveRoundPrice]);

  // Helper function to calculate payouts
  const calculatePayout = (direction, directionAmount, totalAmount) => {
    if (!totalAmount || totalAmount === 0 || !directionAmount || directionAmount === 0) {
      return 2.51; // Default payout
    }
    
    // Calculate a payout multiplier based on the bet distribution
    // Formula: (TotalAmount * 0.97) / DirectionAmount
    // The 0.97 accounts for a hypothetical 3% platform fee
    return (totalAmount * 0.97) / directionAmount;
  };

  // Get payout values with fallbacks
  const upPayout = roundData?.upPayout ?? 2.51;
  const downPayout = roundData?.downPayout ?? 2.51;

  // Determine price movement direction
  const getPriceMovement = () => {
    // For expired rounds, compare with previous round
    if (variant === "expired" && prevRoundData && roundData?.closePrice) {
      const prevEndPrice = Number(prevRoundData.endPrice || 0);
      const currentEndPrice = roundData.closePrice;
      return currentEndPrice > prevEndPrice ? "up" : "down";
    }
    
    // For live rounds, compare with current round's lock price
    if (variant === "live" && roundData?.currentPrice && roundData?.lockPrice) {
      return roundData.currentPrice > roundData.lockPrice ? "up" : "down";
    }
    
    return null;
  };

  const priceMovement = getPriceMovement();

  // Determine if this round can be bet on
  useEffect(() => {
    // Check if round is bettable using the provided function
    if (isRoundBettable && roundId) {
      setCanBet(isRoundBettable(roundId));
    } else {
      // Fallback to PancakeSwap style logic: can only bet on the next round
      const isNextRound = roundId === (currentRoundId || 0) + 1;

      // Check if there's enough time left in the current round (more than buffer time)
      const hasEnoughTimeLeft =
        roundData?.timeRemaining &&
        roundData.timeRemaining > bufferTimeInSeconds;

      setCanBet(isNextRound && hasEnoughTimeLeft);
    }
  }, [
    roundId,
    currentRoundId,
    roundData?.timeRemaining,
    bufferTimeInSeconds,
    isRoundBettable,
  ]);

  // Handle wallet balance
  useEffect(() => {
    if (connected && publicKey) {
      // In a real application, you would fetch the user's SOL balance here
      // For now, we'll just set a default max amount
      setMaxAmount(10);
    }
  }, [connected, publicKey]);

  const handleEnterPrediction = (mode: "up" | "down") => {
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!canBet) {
      alert("Betting is not available for this round");
      return;
    }

    setIsFlipped(true);
    setMode(mode);
  };

  const handlePlaceBet = () => {
    if (!connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!canBet) {
      alert("Betting is not available for this round");
      return;
    }

    if (onPlaceBet && mode) {
      onPlaceBet(mode, amount, roundId);
      setIsFlipped(false);
      setMode("");
      setAmount(0.1);
    }
  };

  const handleCustomAmount = (percentage: number) => {
    setAmount(Number((maxAmount * percentage).toFixed(2)));
  };

  // Generate button style based on variant and price movement
  const getButtonStyle = (direction: "up" | "down") => {
    if (variant === "expired") {
      // For expired rounds, highlight the winning direction
      if (priceMovement === direction) {
        return direction === "up" 
          ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)" 
          : "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)";
      } else {
        return "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)";
      }
    }
    
    // For live rounds, highlight based on current price vs lock price
    if (variant === "live") {
      if (priceMovement === direction) {
        return direction === "up" 
          ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)" 
          : "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)";
      } else {
        return "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)";
      }
    }
    
    // Default styles for other variants
    return direction === "up" 
      ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
      : "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)";
  };

  // Render the next round content (bettable)
  const renderNextRoundContent = () => {
    if (variant !== "next") return null;

    return (
      <div className="flex-1 glass flex flex-col justify-between gap-[13px] rounded-[20px] px-[19px] py-[8.5px]">
        <div className="flex flex-col items-center gap-[7px]">
          <Image
            alt="Solana Background"
            src={SolanaBg}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
          />

          <div className="flex justify-between gap-1 font-semibold text-[16px]">
            <p>Prize Pool</p>
            <p>{roundData?.prizePool?.toFixed(4) ?? 0.1} SOL</p>
          </div>
        </div>

        {canBet ? (
          <>
            <Button
              style={{
                background: "linear-gradient(90deg, #06C729 0%, #04801B 100%)",
              }}
              onClick={() => handleEnterPrediction("up")}
              className="cursor-pointer"
            >
              Enter UP
            </Button>

            <Button
              style={{
                background: "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)",
              }}
              onClick={() => handleEnterPrediction("down")}
              className="cursor-pointer"
            >
              Enter DOWN
            </Button>
          </>
        ) : (
          <div className="text-center py-3 font-semibold">
            Betting closed for this round
          </div>
        )}
      </div>
    );
  };

  // Render later round content (waiting for entry phase)
  const renderLaterRoundContent = () => {
    if (variant !== "later") return null;

    return (
      <div className="flex-1 glass rounded-[20px] flex flex-col gap-[12px] items-center justify-center">
        <Image
          alt="Solana Background"
          src={SolanaBg}
          className="rounded-[10px] w-[215px] h-[142px] object-cover mt-2"
        />
        <div className="flex items-center gap-[12px]">
          <SVG iconName="play-fill" />
          <p className="font-semibold text-[20px]">Next Play</p>
        </div>

        <p className="font-semibold text-[35px]">{formattedTime}</p>
      </div>
    );
  };

  // Render live round content
  const renderLiveRoundContent = () => {
    if (variant !== "live") return null;

    return (
      <div className="flex-1 flex flex-col glass p-[10px] rounded-[20px] items-center">
        <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
          <Image
            alt="Solana Background"
            src={SolanaBg}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
          />

          <div className="flex flex-col gap-[22px] font-semibold text-[#FEFEFE]">
            <div className="flex justify-between">
              <p className="text-[20px]">
                ${roundData?.closePrice?.toFixed(4) ?? 585.1229}
              </p>

              <div className="bg-white flex items-center gap-[4px] text-[#1F1F43] px-[10px] py-[5px] rounded-[5px]">
                <SVG width={8} height={8} iconName={priceDirection === "up" ? "arrow-up" : "arrow-down"} />
                <p className="text-[10px]">${priceDifference.toFixed(4)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <p>Locked Price</p>
              <p>${roundData?.lockPrice?.toFixed(4) ?? 584.1229}</p>
            </div>

            <div className="flex justify-between text-[16px]">
              <p>Prize Pool</p>
              <p>{roundData?.prizePool?.toFixed(4) ?? 8.6015} SOL</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render expired round content
  const renderExpiredRoundContent = () => {
    if (variant !== "expired" && variant !== "locked") return null;

    return (
      <div className="flex-1 flex flex-col glass p-[10px] rounded-[20px] items-center opacity-80">
        <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
          <Image
            alt="Solana Background"
            src={SolanaBg}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
          />

          <div className="flex flex-col gap-[22px] font-semibold text-[#FEFEFE]">
            <div className="flex justify-between">
              <p className="text-[20px]">
                ${roundData?.closePrice?.toFixed(4) ?? 585.1229}
              </p>

              <div className={`bg-white flex items-center gap-[4px] ${
                priceDirection === "up" ? "text-green-500" : "text-red-500"
              } px-[10px] py-[5px] rounded-[5px]`}
              >
                <SVG
                  width={8}
                  height={8}
                  iconName={priceDirection === "up" ? "arrow-up" : "arrow-down"}
                />
                <p className="text-[10px]">
                  ${priceDifference.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <p>Locked Price</p>
              <p>${roundData?.lockPrice?.toFixed(4) ?? 584.1229}</p>
            </div>

            <div className="flex justify-between text-[16px]">
              <p>Prize Pool</p>
              <p>{roundData?.prizePool?.toFixed(4) ?? 8.6015} SOL</p>
            </div>
            
            {/* Add bet status if user placed a bet on this round */}
            {userBetDirection && userBetStatus && (
              <div className={`flex justify-center text-[16px] font-bold ${
                userBetStatus === "WON" ? "text-green-500" : userBetStatus === "LOST" ? "text-red-500" : "text-white"
              }`}>
                <p>{userBetStatus}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`card_container glass rounded-[20px] p-[15px] sm:p-[25px] ${
        variant === "live"
          ? "min-w-[280px] sm:min-w-[320px] md:min-w-[380px]"
          : "min-w-[240px] sm:min-w-[273px] w-full"
      }`}
    >
      <div
        className={`${
          isFlipped ? "hidden" : "flex"
        } flex-col justify-between gap-[10px]`}
      >
        <div
          className={`${
            variant === "expired" ? "opacity-80" : ""
          } flex justify-between font-semibold text-[20px]`}
        >
          <div className="flex items-center gap-[10px]">
            <SVG width={12} height={12} iconName="play-fill" />
            <p className="capitalize">{variant ?? "Expired"}</p>
          </div>

          <p>#{roundId}</p>
        </div>

        <Button
          style={{
            background: getButtonStyle("up"),
          }}
          className={`glass flex flex-col gap-4 py-[16px] ${
            variant === "expired" && priceMovement === "up" ? "border-2 border-green-500" : ""
          } ${
            userBetDirection === "up" ? "border-2 border-yellow-400" : ""
          }`}
          onClick={() =>
            variant === "next" && canBet && handleEnterPrediction("up")
          }
        >
          <div className="flex justify-center items-center gap-2">
            <p className="text-[20px] font-[600] leading-0">UP</p>
            {userBetDirection === "up" && userBetStatus && (
              <span className={`text-[12px] font-bold ml-2 ${
                userBetStatus === "WON" ? "text-green-500" : 
                userBetStatus === "LOST" ? "text-red-500" : "text-yellow-400"
              }`}>
                {userBetStatus}
              </span>
            )}
          </div>
          <p className="text-[10px] font-[600] leading-0">
            {upPayout.toFixed(2)}x payout
          </p>
        </Button>

        {/* Conditional rendering based on variant */}
        {variant === "later"
          ? renderLaterRoundContent()
          : variant === "next"
          ? renderNextRoundContent()
          : variant === "expired"
          ? renderExpiredRoundContent()
          : variant === "locked"
          ? renderExpiredRoundContent()
          : renderLiveRoundContent()}
          
        <Button
          style={{
            background: getButtonStyle("down"),
          }}
          className={`glass flex flex-col gap-4 py-[16px] ${
            variant === "expired" && priceMovement === "down" ? "border-2 border-red-500" : ""
          } ${
            userBetDirection === "down" ? "border-2 border-yellow-400" : ""
          }`}
          onClick={() =>
            variant === "next" && canBet && handleEnterPrediction("down")
          }
        >
          <div className="flex justify-center items-center gap-2">
            <p className="text-[20px] font-[600] leading-0">DOWN</p>
            {userBetDirection === "down" && userBetStatus && (
              <span className={`text-[12px] font-bold ml-2 ${
                userBetStatus === "WON" ? "text-green-500" : 
                userBetStatus === "LOST" ? "text-red-500" : "text-yellow-400"
              }`}>
                {userBetStatus}
              </span>
            )}
          </div>
          <p className="text-[10px] font-[600] leading-0">
            {downPayout.toFixed(2)}x payout
          </p>
        </Button>
      </div>

      <div className={`${isFlipped ? "flex" : "hidden"} flex-col gap-[26px]`}>
        <div className="flex gap-2 items-center font-semibold text-[16px]">
          <SVG
            className="cursor-pointer"
            iconName="arrow-left"
            onClick={() => setIsFlipped(false)}
          />
          <p>Place Order</p>
        </div>

        <div className="flex justify-between items-center">
          <p className="font-semibold text-[16px]">Enter Amount</p>

          <div className="flex items-center gap-[1px]">
            <Image
              className="w-[30px] h-auto object-contain"
              src="/assets/solana_logo.png"
              alt="Solana"
              width={30}
              height={30}
            />
            <p className="font-semibold text-[15px]">SOL</p>
          </div>
        </div>

        <input
          type="number"
          max={maxAmount}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="glass h-[65px] text-right rounded-[20px] pr-4 font-semibold text-[16px] text-white outline-0"
          placeholder="Enter Value:"
        />

        {/* Range Slider */}
        <input
          type="range"
          min="0"
          max={maxAmount}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer my-5 accent-gray-500 custom-slider"
        />

        <div className="flex gap-y-[12px] gap-x-[4px] justify-between flex-wrap">
          {CUSTOM_INPUTS.map((el, key) => (
            <div
              className="glass py-[6px] px-[9px] rounded-[20px] font-semibold text-[10px] cursor-pointer"
              key={key}
              onClick={() => handleCustomAmount(el.value)}
            >
              {el.label}
            </div>
          ))}
        </div>

        <Button onClick={handlePlaceBet}>
          Buy {mode?.toUpperCase()} for {amount} SOL
        </Button>
      </div>
    </div>
  );
}
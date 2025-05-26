"use client";

import { useState, useEffect } from "react";
import Button from "./button.component";
import SVG from "./svg.component";
import Image from "next/image";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import SolanaBg from "@/public/assets/solana_bg.png";
import { ArrowDown, ArrowUp } from "lucide-react";
import NumberFlow from '@number-flow/react';
import { UserBet } from "@/types/round";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import toast from "react-hot-toast";
import { DotLoader } from "react-spinners";
import { useTheme } from "next-themes";

interface IProps {
  variant?: "live" | "expired" | "next" | "later" | "locked";
  roundId?: number;
  roundData?: {
    lockPrice: number;
    closePrice: number;
    currentPrice: number;
    prizePool: number;
    upBets: number;
    downBets: number;
    timeRemaining: number;
    lockTimeRemaining: number;
    lockTime: number;
    closeTime: number;
    isActive: boolean;
    treasuryFee: number;
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
  userBets?: UserBet[];
  isLocked: boolean;
  timeLeft: number | null;
}

const CUSTOM_INPUTS = [
  { label: "10%", value: 0.1 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Max", value: 1.0 },
];

export default function PredictionCard({
  variant,
  roundId = 0,
  roundData,
  onPlaceBet,
  currentRoundId,
  bufferTimeInSeconds = 5,
  liveRoundPrice,
  userBets,
  isLocked,
  timeLeft,
}: IProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"up" | "down" | "">("");
  const [amount, setAmount] = useState<number>(0.1);
  const [maxAmount, setMaxAmount] = useState<number>(10);
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();

  const { theme } = useTheme();

  console.log("PredictionCard Props:", roundData);

  const calculateMultipliers = () => {
    if (!roundData) return { bullMultiplier: "0.00", bearMultiplier: "0.00" };

    const totalAmount = roundData.prizePool;
    const totalBullAmount = roundData.upBets;
    const totalBearAmount = roundData.downBets;

    // If no bets, return 1x multiplier
    if (totalAmount === 0) {
      return { bullMultiplier: "1.00", bearMultiplier: "1.00" };
    }

    const treasuryFeePercent = roundData.treasuryFee / 10000; // Convert basis points to decimal
    const rewardAmount = totalAmount * (1 - treasuryFeePercent);

    // Calculate multipliers: (total reward pool / amount bet in that direction)
    const bullMultiplier =
      totalBullAmount > 0 ? rewardAmount / totalBullAmount : 1;
    const bearMultiplier =
      totalBearAmount > 0 ? rewardAmount / totalBearAmount : 1;

    return {
      bullMultiplier: Math.max(bullMultiplier, 0).toFixed(2),
      bearMultiplier: Math.max(bearMultiplier, 0).toFixed(2),
    };
  };

  const { bullMultiplier, bearMultiplier } = calculateMultipliers();

  useEffect(() => {
    if (!connected || !publicKey) {
      setMaxAmount(0);
      return;
    }
    (async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        setMaxAmount(lamports / LAMPORTS_PER_SOL);
      } catch (err) {
        console.error("Failed to fetch SOL balance:", err);
      }
    })();
  }, [connected, publicKey, connection]);

  const userBetStatus =
    userBets?.find((bet) => bet.roundId === roundId) || null;

  const getPriceMovement = () => {
    if (!roundData) return { difference: 0, direction: "up" as "up" | "down" };
    const currentPrice =
      variant === "expired" && roundData.closePrice > 0
        ? roundData.closePrice
        : liveRoundPrice || roundData.lockPrice;
    const lockPrice = roundData.lockPrice;
    const difference = Math.abs(currentPrice - lockPrice);
    const direction = currentPrice >= lockPrice ? "up" : "down";
    return { difference, direction };
  };

  const { difference: priceDifference, direction: priceDirection } =
    getPriceMovement();

  const canBet =
    variant === "next" &&
    roundId === currentRoundId &&
    roundData?.isActive === true &&
    !isLocked &&
    (timeLeft !== null ? timeLeft > bufferTimeInSeconds : false);

  const formatTimeLeft = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "Locked";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const formattedRoundData = roundData
    ? {
        lockPrice: roundData.lockPrice,
        closePrice:
          roundData.closePrice > 0
            ? roundData.closePrice
            : liveRoundPrice || roundData.lockPrice,
        currentPrice: liveRoundPrice || roundData.lockPrice,
        prizePool: roundData.prizePool,
        upBets: roundData.upBets,
        downBets: roundData.downBets,
        lockTimeRemaining:
          timeLeft !== null
            ? timeLeft
            : Math.max(0, roundData.lockTime - Date.now() / 1000),
        timeRemaining: Math.max(0, roundData.timeRemaining),
        status: roundData.isActive
          ? "LIVE"
          : roundData.timeRemaining > 0
          ? "LOCKED"
          : "ENDED",
      }
    : {
        lockPrice: 0,
        closePrice: liveRoundPrice || 0,
        currentPrice: liveRoundPrice || 0,
        prizePool: 0,
        upBets: 0,
        downBets: 0,
        lockTimeRemaining: 0,
        timeRemaining: 0,
        status: "ENDED" as const,
      };

  console.log("Formatted Round Data:", formattedRoundData);

  const handleEnterPrediction = (mode: "up" | "down") => {
    if (!connected) {
      toast("Please connect your wallet first");
      return;
    }
    if (!canBet) {
      toast("Betting is not available for this round");
      return;
    }
    setIsFlipped(true);
    setMode(mode);
  };

  const handlePlaceBet = () => {
    if (!connected) {
      toast("Please connect your wallet first");
      return;
    }
    if (amount <= 0) {
      toast("Please enter a valid amount");
      return;
    }
    if (!canBet) {
      toast("Betting is not available for this round");
      return;
    }
    if (onPlaceBet && mode && roundId) {
      onPlaceBet(mode, amount, roundId);
      setIsFlipped(false);
      setMode("");
      setAmount(0.1);
    }
  };

  const handleCustomAmount = (percentage: number) => {
    setAmount(Number((maxAmount * percentage).toFixed(2)));
  };

  const getButtonStyle = (direction: "up" | "down") => {
    if (variant === "expired" || variant === "live") {
      if (priceDirection === direction) {
        return direction === "up"
          ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
          : "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)";
      } else {
        return "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)";
      }
    }
    return "";
  };

  const renderNextRoundContent = () => {
    if (variant !== "next") return null;

    if (!roundData) {
      return (
        <div className="flex-1 glass h-[300px] flex flex-col items-center justify-center rounded-[20px] px-[19px] py-[8.5px]">
          <h2 className="text-xl font-semibold text-center">
            Waiting for round data...
          </h2>
          <DotLoader color="#06C729" size={30} className="mt-3" />
        </div>
      );
    }

    if (roundId !== currentRoundId) {
      return (
        <div className="flex-1 glass h-[300px] flex flex-col items-center justify-center rounded-[20px] px-[19px] py-[8.5px]">
          <h2 className="text-xl font-semibold text-center">Future Round</h2>
          <p className="text-sm opacity-70 text-center mt-2">
            Round {roundId} will be available later
          </p>
        </div>
      );
    }

    return (
      <div className="flex-1 glass h-[300px] flex flex-col justify-between gap-[13px] rounded-[20px] px-[19px] py-[8.5px]">
        {!canBet ? (
          <div className="flex flex-col items-center gap-3 justify-center h-[250px]">
            {isLocked ? (
              <>
                <p className="text-xl font-semibold text-center">Locked</p>
                <p className="text-sm opacity-70 text-center">
                  This round is now live
                </p>
              </>
            ) : (
              <>
                <DotLoader
                  color="#ffffff"
                  size={40}
                  aria-label="Loading Spinner"
                  data-testid="loader"
                />
                <h2 className="text-2xl font-semibold mt-4 text-center">
                  Preparing Round...
                </h2>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-[7px]">
              <Image
                alt="Solana Background"
                src={SolanaBg || "/placeholder.svg"}
                className="rounded-[10px] w-[215px] h-[142px] object-cover"
                width={215}
                height={142}
              />
              <div className="flex justify-between gap-1 font-semibold text-[16px] w-full">
                <p>Prize Pool</p>
                <p>{roundData.prizePool.toFixed(4)} SOL</p>
              </div>
              <div className="flex justify-between gap-1 font-semibold text-[16px] w-full">
                <p>Time Left</p>
                <p>{formatTimeLeft(timeLeft)}</p>
              </div>
            </div>

            {canBet ? (
              <>
                <Button
                  style={{
                    background:
                      "linear-gradient(90deg, #06C729 0%, #04801B 100%)",
                  }}
                  onClick={() => handleEnterPrediction("up")}
                  className="cursor-pointer"
                >
                  Enter UP
                </Button>
                <Button
                  style={{
                    background:
                      "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)",
                  }}
                  onClick={() => handleEnterPrediction("down")}
                  className="cursor-pointer"
                >
                  Enter DOWN
                </Button>
              </>
            ) : (
              <div className="text-center py-3 font-semibold opacity-70">
                {isLocked ? "Round Locked" : "Betting Unavailable"}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderLaterRoundContent = () => {
    if (variant !== "later") return null;

    const baseRemaining = timeLeft || 0;
    const totalSeconds =
      variant === "later" ? baseRemaining : baseRemaining + 120;

    const display =
      totalSeconds > 0
        ? `${Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, "0")}:${Math.floor(totalSeconds % 60)
            .toString()
            .padStart(2, "0")}`
        : "Waiting";
    return (
      <div className="glass h-[300px] rounded-[20px] flex flex-col gap-[12px] items-center justify-center">
        <div className="flex items-center gap-[12px]">
          <SVG iconName="play-fill" />
          <p className="font-semibold text-[20px]">Next Play</p>
        </div>
        <p className="font-semibold text-[35px]">{display}</p>
      </div>
    );
  };

  const renderLiveRoundContent = () => {
    if (variant !== "live") return null;

    const getPriceTextStyle = () => {
      return `text-[20px] ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-900"
      }`;
    };

    const getContentTextStyle = () => {
      return `font-semibold ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-800"
      }`;
    };

    const getLabelTextStyle = () => {
      return `text-[10px] ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-600"
      }`;
    };

    const getPriceDirectionBg = () => {
      return theme === "dark" ? "bg-white" : "bg-gray-100";
    };

    return (
      <>
        {isLocked ? (
         
          <div className="flex-1 glass h-[300px] flex flex-col justify-between gap-[13px] rounded-[20px] px-[19px] py-[8.5px]">
             <div className="flex flex-col items-center gap-3 justify-center h-[250px]">
            <DotLoader
              color="#ffffff"
              size={40}
              aria-label="Loading Spinner"
              data-testid="loader"
            />
            <h2 className="text-2xl font-semibold mt-4 text-center">
              Calculating...
            </h2>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[300px] glass p-[10px] rounded-[20px] items-center">
            <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
              <Image
                alt="Solana Background"
                src={SolanaBg || "/placeholder.svg"}
                className="rounded-[10px] w-[215px] h-[142px] object-cover"
                width={215}
                height={142}
              />
              <div
                className={`flex flex-col gap-[22px] font-semibold ${getContentTextStyle()}`}
              >
                <div className="flex justify-between">
                  <NumberFlow
                    value={formattedRoundData.closePrice}
                    format={{
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4
                    }}
                    className={`${getPriceTextStyle()} ${
                      priceDirection === "up" ? "text-green-500" : "text-red-500"
                    }`}
                    transformTiming={{
                      duration: 800,
                      easing: 'ease-out'
                    }}
                  />
                  <div
                    className={`${getPriceDirectionBg()} flex items-center gap-[4px] ${
                      priceDirection === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    } px-[10px] py-[5px] rounded-[5px]`}
                  >
                    {priceDirection === "up" ? (
                      <ArrowUp size={12} />
                    ) : (
                      <ArrowDown size={12} />
                    )}
                    <p className="text-[10px]">${priceDifference.toFixed(4)}</p>
                  </div>
                </div>
                <div
                  className={`flex justify-between items-center ${getLabelTextStyle()}`}
                >
                  <p>Locked Price</p>
                  <p>${formattedRoundData.lockPrice.toFixed(4)}</p>
                </div>
                <div className="flex justify-between text-[16px]">
                  <p>Prize Pool</p>
                  <p>{formattedRoundData.prizePool.toFixed(4)} SOL</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderExpiredRoundContent = () => {
    if (variant !== "expired" && variant !== "locked") return null;

    const getPriceTextStyle = () => {
      return `text-[20px] ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-900"
      }`;
    };

    const getContentTextStyle = () => {
      return `font-semibold ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-800"
      }`;
    };

    const getLabelTextStyle = () => {
      return `text-[10px] ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-600"
      }`;
    };

    const getPriceDirectionBg = () => {
      return theme === "dark" ? "bg-white" : "bg-gray-100";
    };

    const getOpacityStyle = () => {
      return theme === "dark" ? "opacity-80" : "opacity-70";
    };

    return (
      <div
        className={`flex-1 flex flex-col glass p-[10px] rounded-[20px] items-center ${getOpacityStyle()}`}
      >
        <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
          <Image
            alt="Solana Background"
            src={SolanaBg || "/placeholder.svg"}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
            width={215}
            height={142}
          />
          <div
            className={`flex flex-col gap-[22px] font-semibold ${getContentTextStyle()}`}
          >
            <div className="flex justify-between">
              <p className={getPriceTextStyle()}>
                ${formattedRoundData.closePrice.toFixed(4)}
              </p>
              <div
                className={`${getPriceDirectionBg()} flex items-center gap-[4px] ${
                  priceDirection === "up" ? "text-green-500" : "text-red-500"
                } px-[10px] py-[5px] rounded-[5px]`}
              >
                {priceDirection === "up" ? (
                  <ArrowUp size={12} />
                ) : (
                  <ArrowDown size={12} />
                )}
                <p className="text-[10px]">${priceDifference.toFixed(4)}</p>
              </div>
            </div>
            <div
              className={`flex justify-between items-center ${getLabelTextStyle()}`}
            >
              <p>Locked Price</p>
              <p>${formattedRoundData.lockPrice.toFixed(4)}</p>
            </div>
            <div className="flex justify-between text-[16px]">
              <p>Prize Pool</p>
              <p>{formattedRoundData.prizePool.toFixed(4)} SOL</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!roundData && variant !== "later" && variant !== "next")
    return <div>No round data available</div>;

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
          } flex flex-col`}
        >
          <div className="flex justify-between items-center font-semibold text-[20px]">
            <div className="flex items-center gap-[10px]">
              <SVG width={12} height={12} iconName="play-fill" />
              <p className="capitalize">{variant}</p>
            </div>
            <p>#{roundId}</p>
          </div>
          {variant === "live" && !isLocked && (
            <div className="mt-1 w-full h-[6px] rounded-full overflow-hidden flex gap-[4px]">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="h-full flex-1 rounded-[1px]"
                  style={{
                    backgroundColor:
                      i < Math.floor(((120 - (timeLeft || 0)) / 120) * 7)
                        ? "#E5E7EB"
                        : "#6B7280",
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <Button
          style={{ background: getButtonStyle("up") }}
          className={`glass flex flex-col gap-4 py-[16px] ${
            variant === "expired" ||
            (variant === "live" && priceDirection === "up")
              ? "border-2 border-green-500"
              : ""
          } `}
        >
          <div className="flex justify-center items-center gap-2">
            <p className="text-[20px] font-[600] leading-0">UP</p>
          </div>
          <p className="text-[10px] font-[600] leading-0">
            {bullMultiplier}x payout
          </p>
        </Button>
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
          style={{ background: getButtonStyle("down") }}
          className={`glass flex flex-col gap-4 py-[16px] ${
            variant === "expired" ||
            (variant === "live" && priceDirection === "down")
              ? "border-2 border-red-500"
              : ""
          }`}
        >
          <div className="flex justify-center items-center gap-2">
            <p className="text-[20px] font-[600] leading-0">DOWN</p>
          </div>
          <p className="text-[10px] font-[600] leading-0">
            {bearMultiplier}x payout
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
        <input
          type="range"
          min="0"
          max={maxAmount}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number.parseFloat(e.target.value))}
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
        <Button className="cursor-pointer" onClick={handlePlaceBet}>
          Buy {mode?.toUpperCase()} for {amount} SOL
        </Button>
      </div>
    </div>
  );
}

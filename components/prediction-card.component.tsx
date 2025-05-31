"use client";

import { useState, useEffect, useMemo } from "react";
import Button from "./button.component";
import SVG from "./svg.component";
import BetFailed from "@/public/assets/BetFailure.png";
import Image from "next/image";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import SolanaBg from "@/public/assets/solana_bg.png";
import { ArrowDown, ArrowUp } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { UserBet } from "@/types/round";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import toast from "react-hot-toast";
import { DotLoader, PuffLoader } from "react-spinners";
import { useTheme } from "next-themes";
import io from "socket.io-client";
import { API_URL } from "@/lib/config";
import { useRoundManager } from "@/hooks/roundManager";

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
  ) => Promise<boolean>;
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
const WS_URL = API_URL;
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
  const [inputValue, setInputValue] = useState("0.1");
  const [amount, setAmount] = useState(0.1);
  const [maxAmount, setMaxAmount] = useState<number>(10);
  const [justBet, setJustBet] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [scriptBetPlaced, setScriptBetPlaced] = useState(false);

  const { theme } = useTheme();

  const {
    config,
  } = useRoundManager(5, 0);
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

  const socket = useMemo(() => io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
    }), []);

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

  useEffect(() => {
        if (!connected || !publicKey) return;
    
        const handleNewBet = (newBet: any) => {
          // if this bet is from our currently connected wallet …
          if (newBet.data.user === publicKey.toString()
            && newBet.data.round_number === roundId
          ) {
            // mark that they have already bet by any means
            setScriptBetPlaced(true);
          }
        };
    
        socket.on("newBetPlaced", handleNewBet);
        return () => {
          socket.off("newBetPlaced", handleNewBet);
        };
       }, [connected, publicKey, roundId, socket]);
     

  const userBetStatus =
    userBets?.find((bet) => bet.roundId === roundId) || null;
    const hasUserBet = userBetStatus !== null || justBet || scriptBetPlaced;
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
    (timeLeft ?? 0) > bufferTimeInSeconds &&
    !hasUserBet;

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



  const handleEnterPrediction = (mode: "up" | "down") => {
    setInputError(null);
    if (!connected) {
      toast.custom(
        (t) => (
          <div
            className={`
             w-full glass text-center  max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
            shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
            flex flex-col items-center p-4 mt-12
             ${
               theme === "dark"
                 ? "bg-gray-800 text-white"
                 : "bg-white text-black"
             }
          `}
            style={{
              // slide in/out from top
              animation: t.visible
                ? "fadeInDown 200ms ease-out forwards"
                : "fadeOutUp 150ms ease-in forwards",
            }}
          >
            <p className=" max-w-sm mx-auto  text-lg font-semibold">
            Please connect your wallet first
            </p>
          </div>
        ),
        {
          position: "top-center",
        }
      
      );
      return;
    }
    if (!canBet) {
      // toast("Betting is not available for this round");
      toast.custom(
        (t) => (
          <div
            className={`
             w-full glass text-center animate-toast-bounce h-[400px] max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
            shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
            flex flex-col items-center p-4 pb-8 mt-16
             ${
               theme === "dark"
                 ? "bg-gray-800 text-white"
                 : "bg-white text-black"
             }
          `}
            style={{
              // slide in/out from top
              animation: t.visible
                ? "fadeInDown 200ms ease-out forwards"
                : "fadeOutUp 150ms ease-in forwards",
            }}
          >
            <div className="w-full animate-pulse h-[280px] relative mb-4">
              <Image
                src={BetFailed}
                alt="lock"
                fill
                className="object-contain rounded-xl"
              />
            </div>

            <h3 className="font-bold text-2xl text-center animate-toast-pulse   mb-2">
              Bet Failed
            </h3>

            <p className=" text-sm">
            You were unable to place the bet, 
            please try again later
            </p>
          </div>
        ),
        {
          position: "top-center",
        }
      );
      return;
    }
    if (userBetStatus !== null) {
      // toast("You have already placed a bet on this round");
      toast.custom(
        (t) => (
          <div
            className={`
             w-full glass text-center  max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
            shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
            flex flex-col items-center p-4 mt-12
             ${
               theme === "dark"
                 ? "bg-gray-800 text-white"
                 : "bg-white text-black"
             }
          `}
            style={{
              // slide in/out from top
              animation: t.visible
                ? "fadeInDown 200ms ease-out forwards"
                : "fadeOutUp 150ms ease-in forwards",
            }}
          >
            <p className=" max-w-sm mx-auto  text-lg font-semibold">
            You have already placed a bet on this round.
            </p>
          </div>
        ),
        {
          position: "top-center",
        }
      
      );
      return;
    }
    setIsFlipped(true);
    setMode(mode);
  };

  const handlePlaceBet = async () => {
    if (inputValue.trim() === "") {
      setInputError("Please enter an amount");
      return;
    }
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed) || parsed <= 0) {
      setInputError("Enter a valid number");
      return;
    }

    setInputError(null);
    if (!connected) {
      toast.custom(
        (t) => (
          <div
            className={`
             w-full glass text-center  max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
            shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
            flex flex-col items-center p-4 mt-12
             ${
               theme === "dark"
                 ? "bg-gray-800 text-white"
                 : "bg-white text-black"
             }
          `}
            style={{
              // slide in/out from top
              animation: t.visible
                ? "fadeInDown 200ms ease-out forwards"
                : "fadeOutUp 150ms ease-in forwards",
            }}
          >
            <p className=" max-w-sm mx-auto  text-lg font-semibold">
            Please connect your wallet first
            </p>
          </div>
        ),
        {
          position: "top-center",
        }
      
      );
      return;
    }
    if (amount <= 0) {
      toast.custom(
        (t) => (
          <div
            className={`
             w-full glass text-center  max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
            shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
            flex flex-col items-center p-4 mt-12
             ${
               theme === "dark"
                 ? "bg-gray-800 text-white"
                 : "bg-white text-black"
             }
          `}
            style={{
              // slide in/out from top
              animation: t.visible
                ? "fadeInDown 200ms ease-out forwards"
                : "fadeOutUp 150ms ease-in forwards",
            }}
          >
            <p className=" max-w-sm mx-auto  text-lg font-semibold">
            Please enter a valid amount
            </p>
          </div>
        ),
        {
          position: "top-center",
        }
      
      );
      return;
    }
    if (!canBet) {
      toast.custom(
        (t) => (
          <div
            className={`
             w-full glass text-center  max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
            shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
            flex flex-col items-center p-4 mt-12
             ${
               theme === "dark"
                 ? "bg-gray-800 text-white"
                 : "bg-white text-black"
             }
          `}
            style={{
              // slide in/out from top
              animation: t.visible
                ? "fadeInDown 200ms ease-out forwards"
                : "fadeOutUp 150ms ease-in forwards",
            }}
          >
            <p className=" max-w-sm mx-auto  text-lg font-semibold">
            Betting is not available for this round
            </p>
          </div>
        ),
        {
          position: "top-center",
        }
      
      );
      return;
    }

    // if (amount > 1) {
    //   toast.custom(
    //     (t) => (
    //       <div
    //         className={`
    //                         w-full glass text-center h-[400px] max-w-[600px] bg-white dark:bg-gray-800 rounded-2xl
    //                        shadow-xl animate-toast-bounce ring-1 ring-black ring-opacity-5 overflow-hidden justify-space-between
    //                        flex flex-col items-start p-4 pb-8 mt-16
    //                         ${
    //                           theme === "dark"
    //                             ? "bg-gray-800 text-white"
    //                             : "bg-white text-black"
    //                         }
    //                      `}
    //         style={{
    //           // slide in/out from top
    //           animation: t.visible
    //             ? "fadeInDown 200ms ease-out forwards"
    //             : "fadeOutUp 150ms ease-in forwards",
    //         }}
    //       >
    //         <div className="w-full animate-vibrate h-[280px] relative mb-4">
    //           <Image
    //             src={BigBet}
    //             alt="big bet"
    //             fill
    //             className="object-cover rounded-xl"
    //           />
    //         </div>

    //         <h3 className="font-bold text-2xl animate-toast-pulse  mb-2">Big Bet Notification</h3>

    //         <p className=" text-sm">John Doe made a {amount} SOL bet</p>
    //       </div>
    //     ),
    //     {
    //       position: "top-center",
    //     }
    //   );
    // }

    if (onPlaceBet && mode && roundId) {
      setIsSubmitting(true);
      try {
        const betStatus = await onPlaceBet(mode, amount, roundId);
      
        if (betStatus === true){
           setJustBet(true);
        }
       
      } finally {
        setIsSubmitting(false);
        setIsFlipped(false);
        setMode("");
        setAmount(0.1);
        setInputValue("0.10");
      }
    }
  };

  const handleCustomAmount = (percentage: number) => {
    const calculatedAmount = maxAmount * percentage;
    const clampedAmount = Math.max(0.01, Math.min(calculatedAmount, maxAmount));
    setAmount(Math.round(clampedAmount * 100) / 100);
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
    // const hasUserBet = userBetStatus !== null;

    let buttonDisabled = isLocked || hasUserBet;
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
          {/* <div className="flex justify-between gap-1 font-semibold text-[16px] w-full">
            <p>Time Left</p>
            <p>{formatTimeLeft(timeLeft)}</p>
          </div> */}
        </div>

        <>
          <Button
            style={{
              background: buttonDisabled
                ? "#9CA3AF"
                : "linear-gradient(90deg, #06C729 0%, #04801B 100%)",
            }}
            onClick={() =>
              buttonDisabled ? undefined : handleEnterPrediction("up")
            }
            className={`glass flex flex-col gap-4 py-[16px] ${
              buttonDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:opacity-80"
            }`}
            disabled={buttonDisabled}
          >
            Enter UP
          </Button>
          <Button
            style={{
              background: buttonDisabled
                ? "#9CA3AF"
                : "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)",
            }}
            onClick={() =>
              buttonDisabled ? undefined : handleEnterPrediction("down")
            }
            className={`glass flex flex-col gap-4 py-[16px] ${
              buttonDisabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:opacity-80"
            }`}
            disabled={buttonDisabled}
          >
            Enter DOWN
          </Button>
        </>
      </div>
    );
  };

  const renderLaterRoundContent = () => {
    if (variant !== "later") return null;

    const baseRemaining = timeLeft || 0;
    const totalSeconds =
      variant === "later" ? baseRemaining : baseRemaining + (config?.lockDuration || 180);

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
          <div className="flex flex-col h-[350px] glass p-[10px] rounded-[20px] items-center">
            <div className="max-w-[250px] flex flex-col gap-[33px] justify-between flex-1">
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
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    }}
                    className={`${getPriceTextStyle()} ${
                      priceDirection === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                    transformTiming={{
                      duration: 800,
                      easing: "ease-out",
                    }}
                  />
                  <div
                    className={`${getPriceDirectionBg()} flex items-center gap-[4px] ${
                      priceDirection === "up"
                        ? "text-green-500"
                        : "text-red-500"
                    } px-[10px] py-[10px] rounded-[5px]`}
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
                      i < Math.floor((((config?.lockDuration || 180) - (timeLeft || 0)) / (config?.lockDuration || 180)) * 7)
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
          type="text" // allows any characters
          value={inputValue}
          placeholder="Enter Value:"
          onChange={(e) => {
            const raw = e.target.value;
            if (
              raw === "" ||
              /^(?:0|[1-9]\d*)(?:\.\d{0,10})?$/.test(raw) 
            ) {
              setInputValue(raw);
            }
          }}
          onBlur={() => {
            const parsed = parseFloat(inputValue);
            if (isNaN(parsed) || parsed <= 0) {
              setAmount(0.01);
              setInputValue("0.01");
            } else {
              const clamped = Math.min(parsed, maxAmount);
              setAmount(clamped);
              setInputValue(String(clamped));
            }
          }}
          className="glass h-[65px] text-right rounded-[20px] pr-4 font-semibold text-[16px] outline-0"
        />
         {inputError && (
              <p className="mt-1 text-red-500 text-sm">{inputError}</p>
            )}
        <input
          type="range"
          min="0.01"
          max={maxAmount}
          step="0.01"
          value={Math.min(amount, maxAmount)} // Ensure value doesn't exceed max
          onChange={(e) => {
            const value = parseFloat(e.target.value);
            const clampedValue = Math.max(0.01, Math.min(value, maxAmount));
            setAmount(Math.round(clampedValue * 100) / 100);
          }}
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
        <Button  className="cursor-pointer flex items-center justify-center" 
  disabled={isSubmitting} onClick={handlePlaceBet}>
           {isSubmitting
    ? <PuffLoader color="#ffffff" size={20} />
    : `Buy ${mode?.toUpperCase()} for ${parseFloat(inputValue || "0").toFixed(2)} SOL`
  }
        </Button>
      </div>
    </div>
  );
}

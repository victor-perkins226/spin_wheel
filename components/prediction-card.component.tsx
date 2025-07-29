"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Button from "./button.component";
import SVG from "./svg.component";
import Image from "next/image";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import SolanaBg from "@/public/assets/solana_bg.png";
import { ArrowDown, ArrowUp } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { Config, UserBet } from "@/types/round";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import toast from "react-hot-toast";
import { DotLoader, PuffLoader } from "react-spinners";
import { useTheme } from "next-themes";
import io, { Socket } from "socket.io-client";
import { API_URL } from "@/lib/config";
import {
  BetFailedToast,
  BettingNotAvailableToast,
  ConnectWalletBetToast,
  InvalidAmountToast,
} from "./toasts";
import { formatNum } from "@/lib/utils";
import { useTranslation } from "next-i18next";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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
  liveTotalForThisRound: number;
  isClaimable?: boolean;
  isClaiming?: boolean;
  claimableBets?: Array<{ roundNumber: number; payout: number; }>;
  config?: Config;
}

const CUSTOM_INPUTS = [
  { label: "10%", value: 0.1 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Max", value: 1.0 },
];
const WS_URL = API_URL;
let globalSocket: Socket | null = null;
const getSocket = () => {
  if (!globalSocket) {
    globalSocket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
    });
  }
  return globalSocket;
};
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
  liveTotalForThisRound,
  isClaimable,
  isClaiming,
  claimableBets,
  config,
}: IProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"up" | "down" | "">("");
  const [inputValue, setInputValue] = useState("0.1");
  const [amount, setAmount] = useState(0.1);
  const [maxAmount, setMaxAmount] = useState<number>(10);
  const [justBet, setJustBet] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { connected, publicKey, connect } = useWallet();
  const { connection } = useConnection();
  const isValidAmount = useMemo(
    () =>
      inputValue !== "" &&
      !isNaN(parseFloat(inputValue)) &&
      parseFloat(inputValue) > 0 &&
      parseFloat(inputValue) <= maxAmount,
    [inputValue, maxAmount]
  );
  useEffect(() => {
    if (!isFlipped) return;
    if (!connected || isLocked || (timeLeft !== null && timeLeft <= bufferTimeInSeconds)) {
      setIsFlipped(false);
    }
  }, [isFlipped, connected, isLocked, timeLeft, bufferTimeInSeconds]);

  const [claimLoading, setClaimLoading] = useState(false);
  const [hasLocallyClaimed, setHasLocallyClaimed] = useState(false);

  useEffect(() => {
    const handler = () => setHasLocallyClaimed(true);
    window.addEventListener("claimSuccess", handler);
    return () => window.removeEventListener("claimSuccess", handler);
  }, []);
  // const [showClaimBanner, setShowClaimBanner] = useState(false);

  const [scriptBetPlaced, setScriptBetPlaced] = useState(false);

  const [lockedPriceLocal, setLockedPriceLocal] = useState<number | null>(null);
  const [prizePoolLocal, setPrizePoolLocal] = useState<number>(
    roundData?.prizePool ?? 0
  );
  const [upBetsLocal, setUpBetsLocal] = useState<number>(
    roundData?.upBets ?? 0
  );
  const [downBetsLocal, setDownBetsLocal] = useState<number>(
    roundData?.downBets ?? 0
  );
  const minBet = Number(config?.minBetAmount) / LAMPORTS_PER_SOL || 0.01;
  const step = 0.01; 
  const defaultBet = 0.1;


  useEffect(() => {
    // only seed the first time we get a positive lockPrice
    if (
      lockedPriceLocal == null &&
      typeof roundData?.lockPrice === "number" &&
      roundData.lockPrice > 0
    ) {
      setLockedPriceLocal(roundData.lockPrice);
    }
  }, [roundData?.lockPrice, lockedPriceLocal]);
  useEffect(() => {
    if (!roundData) return;
    setUpBetsLocal(roundData.upBets);
    setDownBetsLocal(roundData.downBets);
    setPrizePoolLocal(roundData.prizePool);
  }, [roundData?.upBets, roundData?.downBets, roundData?.prizePool]);

  useEffect(() => {
    if (roundData) {
      if (roundData?.lockPrice && roundData.lockPrice > 0) {
        setLockedPriceLocal(roundData.lockPrice);
      }
      setPrizePoolLocal(roundData.prizePool);
    }
  }, [roundId, roundData, roundData?.lockPrice]);

  const { theme } = useTheme();
  const { t } = useTranslation("common");


  const roundIdRef = useRef(roundId);
  const connectedRef = useRef(connected);
  const publicKeyRef = useRef(publicKey);

  const feeBps = roundData?.treasuryFee || 0;
  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    roundIdRef.current = roundId;
  }, [roundId]);

  useEffect(() => {
    if (!isFlipped) return;
    if (isLocked || (timeLeft !== null && timeLeft <= bufferTimeInSeconds)) {
      setIsFlipped(false);
    }
  }, [isFlipped, isLocked, timeLeft, bufferTimeInSeconds]);
  useEffect(() => {
    // keep the latest roundId in a ref
    roundIdRef.current = roundId;

    const handleNewBet = (evt: any) => {
      const { round_number, amount, prediction, user } = evt.data;
      if (round_number !== roundIdRef.current) return;
      const solAmt = amount / LAMPORTS_PER_SOL;
      if (prediction) setUpBetsLocal((prev) => prev + solAmt);
      else setDownBetsLocal((prev) => prev + solAmt);
      setPrizePoolLocal((prev) => prev + solAmt);
      if (user === publicKey?.toString()) {
        setScriptBetPlaced(true);

        window.dispatchEvent(
          new CustomEvent("betPlaced", {
            detail: { roundId: round_number, direction: prediction, amount },
          })
        );
      }
    };

    const handleCancelBet = (evt: any) => {
      const { round_number, amount, prediction } = evt.data;
      if (round_number !== roundIdRef.current) return;
      const solAmt = amount / LAMPORTS_PER_SOL;
      if (prediction) setUpBetsLocal((prev) => (prev - solAmt) || 0);
      else setDownBetsLocal((prev) => (prev - solAmt) || 0);
      setPrizePoolLocal((prev) => (prev - solAmt) || 0);
    }
    socket.on("newBetPlaced", handleNewBet);
    socket.on("betCanceled", handleCancelBet);
    return () => {
      socket.off("newBetPlaced", handleNewBet);
    };
  }, [socket, publicKey, variant, roundId]);

  function calculateMultipliers(
    totalBull: number,
    totalBear: number,
    totalFeeBps: number
  ) {
    const totalPool = totalBull + totalBear;
    const feeAmount = (totalPool * totalFeeBps) / 10000;
    const netPool = totalPool - feeAmount;

    const bullMultiplier = totalBull > 0 ? netPool / totalBull : 1;
    const bearMultiplier = totalBear > 0 ? netPool / totalBear : 1;
    return {
      bullMultiplier: bullMultiplier.toFixed(2),
      bearMultiplier: bearMultiplier.toFixed(2),
    };
  }

  const { bullMultiplier, bearMultiplier } = useMemo(
    () => calculateMultipliers(upBetsLocal, downBetsLocal, feeBps),
    [upBetsLocal, downBetsLocal, feeBps, lockedPriceLocal]
  );

  // Update refs when values change
  useEffect(() => {
    roundIdRef.current = roundId;
    connectedRef.current = connected;
    publicKeyRef.current = publicKey;
  });

  let poolUp: number, poolDown: number, poolTotal: number;
  let feeAmount: number;

  if (variant === "next") {
    // For next rounds, use local bet amounts
    poolUp = upBetsLocal;
    poolDown = downBetsLocal;
    poolTotal = poolUp + poolDown;
    feeAmount = (poolTotal * feeBps) / 10000;
  } else if (variant === "live") {
    poolUp = upBetsLocal;
    poolDown = downBetsLocal;
    poolTotal = poolUp + poolDown;
    feeAmount = (poolTotal * roundData!.treasuryFee) / 10000;
  } else {
    poolUp = upBetsLocal;
    poolDown = downBetsLocal;
    poolTotal = prizePoolLocal;
    feeAmount = (poolTotal * roundData!.treasuryFee) / 10000;
  }

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

  // useEffect(() => {
  //   if (!connected || !publicKey) return;

  //   const handleNewBet = (newBet: any) => {
  //     if (
  //       newBet.data.user === publicKey.toString() &&
  //       newBet.data.round_number === roundId
  //     ) {
  //       setScriptBetPlaced(true);
  //     }
  //   };

  //   socket.on("newBetPlaced", handleNewBet);
  //   return () => {
  //     socket.off("newBetPlaced", handleNewBet);
  //   };
  // }, [connected, publicKey, roundId, socket]);

  const buyDisabled = useMemo(
    () => isSubmitting || !isValidAmount || !connected || config?.isPaused,
    [isSubmitting, isValidAmount, connected, config?.isPaused, config]
  );

  const handlePrizePoolUpdate = useCallback((data: any) => {
    if (data.roundId === roundIdRef.current) {
      setPrizePoolLocal(data.newPrizePool / LAMPORTS_PER_SOL);
    }
  }, []);

  const handleRoundLocked = useCallback((data: any) => {
    if (data.roundId === roundIdRef.current && data.lockPrice) {
      setLockedPriceLocal(data.lockPrice);
    }
  }, []);

  useEffect(() => {
    const onRoundLocked = (data: { roundId: number; lockPrice: number }) => {
      if (data.roundId === roundId) {
        setLockedPriceLocal(data.lockPrice);
      }
    };
    socket.on("roundLocked", onRoundLocked);
    return () => {
      socket.off("roundLocked", onRoundLocked);
    };
  }, [socket, roundId]);

  useEffect(() => {
    if (!roundData) return;

    socket.on("prizePoolUpdate", handlePrizePoolUpdate);
    // socket.on("roundLocked", handleRoundLocked);

    return () => {
      socket.off("prizePoolUpdate", handlePrizePoolUpdate);
      // socket.off("roundLocked", handleRoundLocked);
    };
  }, [roundData, socket, handlePrizePoolUpdate, handleRoundLocked]);

  const [betValue, setBetValue] = useState<number | null>(null);
  const userBetStatus = useMemo(
    () => userBets?.find((bet) => bet.roundId === roundId) ?? null,
    [userBets, roundId]
  );
  const hasUserBet = useMemo(
    () => betValue !== null || justBet || scriptBetPlaced,
    [betValue, justBet, scriptBetPlaced]
  );
  useEffect(() => {
    // Whenever userBets updates, if there’s a bet for this round, cache it:
    if (userBetStatus) {
      // If you already store amount in SOL, remove the division; adjust accordingly:
      setBetValue(userBetStatus.amount);
    }
  }, [userBetStatus]);
  useEffect(() => {
    const hide = () => {
      // setShowClaimBanner(false)
      setClaimLoading(false);
    };

    window.addEventListener("claimSuccess", hide);
    return () => {
      window.removeEventListener("claimSuccess", hide);
    };
  }, []);

  const prevBetRef = useRef<UserBet["status"] | null>(null);

  useEffect(() => {
    const handler = (d: { roundId: number; lockPrice: number }) => {
      if (d.roundId === roundId) setLockedPriceLocal(d.lockPrice);
    };
    socket.on("roundLocked", handler);
    return () => {
      socket.off("roundLocked", handler);
    };
  }, [socket, roundId]);

  const lockPrice =
    lockedPriceLocal ?? roundData?.lockPrice ?? roundData?.currentPrice ?? 0;

  function getPriceMovement() {
    if (!roundData) return { difference: 0, direction: "up" as const };
    const lp = lockPrice;
    const cp =
      variant === "expired" || variant === "locked"
        ? roundData.closePrice || lp
        : liveRoundPrice!;
    const diff = Math.abs(cp - lp);
    return { difference: diff, direction: cp === lp ? "equal" : cp > lp ? "up" : "down" };
  }

  const { difference: priceDifference, direction: priceDirection } =
    getPriceMovement();

  const canBet =
    variant === "next" &&
    roundId === currentRoundId &&
    roundData?.isActive === true &&
    !isLocked &&
    (timeLeft ?? 0) > bufferTimeInSeconds &&
    !hasUserBet;

  const formatTimeLeft = useCallback((seconds: number | null) => {
    if (seconds === null || seconds <= 0) return <>{t("locked")}</>;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  const formattedRoundData = roundData
    ? {
        lockPrice: lockPrice,
        closePrice:
          roundData.closePrice > 0
            ? roundData.closePrice
            : roundData.currentPrice,
        currentPrice: roundData.currentPrice,
        prizePool: prizePoolLocal,
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
          <>
            <ConnectWalletBetToast />
          </>
        ),
        {
          position: "top-right",
        }
      );
      return;
    }
    if (!canBet) {
      // toast("Betting is not available for this round");
      toast.custom((t) => <BetFailedToast theme={theme} />, {
        position: "top-right",
      });
      return;
    }
    if (userBetStatus !== null) {
      // toast("You have already placed a bet on this round");
      toast.custom(
        (t) => (
          <>
            <BetFailedToast theme={theme} />
          </>
        ),
        {
          position: "top-right",
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
          <>
            <ConnectWalletBetToast />
          </>
        ),
        {
          position: "top-right",
        }
      );
      return;
    }

    if (amount <= 0) {
      toast.custom((t) => <InvalidAmountToast theme={theme} />, {
        position: "top-right",
      });
      return;
    }
    if (!canBet) {
      toast.custom(
        (t) => (
          <>
            <BettingNotAvailableToast theme={theme} />
          </>
        ),
        {
          position: "top-right",
        }
      );
      return;
    }
    if (buyDisabled) return;
    if (onPlaceBet && mode && roundId) {
      setIsSubmitting(true);
      try {
        const betStatus = await onPlaceBet(mode, amount, roundId);

        if (betStatus === true) {
          setJustBet(true);
          setBetValue(amount);
          if (typeof window !== "undefined") {
            // Emit custom event to trigger parent refresh
            window.dispatchEvent(
              new CustomEvent("betPlaced", {
                detail: { roundId, direction: mode, amount },
              })
            );
          }
        }
      }
      catch (error)  {
        console.log({error})
      }
      finally {
        setIsSubmitting(false);
        setIsFlipped(false);
        setMode("");
        setAmount(defaultBet);
        setInputValue(formatNum(defaultBet));
      }
    }
  };

  const handleCustomAmount = useCallback(
    (percentage: number) => {
      const calculatedAmount = maxAmount * percentage;
      const clampedAmount = Math.max(
        minBet,
        Math.min(calculatedAmount, maxAmount)
      );
      const rounded = Math.floor(clampedAmount * 100) / 100;
      setAmount(rounded);
      setInputValue(String(rounded));
    },
    [maxAmount]
  );

  const getButtonStyle = (direction: "up" | "down" | "equal") => {
    if (variant === "expired" || variant === "live") {
      if (priceDirection === direction) {
        if (direction === "up") {
          return "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
        }
        else if (direction === "down") {
          return "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)";
        } 
      } else {
        return "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)";
      }
    }
    if (variant === "next" && hasUserBet && userBetStatus) {
      if (userBetStatus.direction === direction) {
        if (direction === "up") {
          return "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
        }
        else if (direction === "down") {
          return "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)";
        }
      } else {
        return "#9CA3AF";
      }
    }

    return "";
  };

  const renderNextRoundContent = () => {
    if (variant !== "next") return null;

    let buttonDisabled = isLocked || hasUserBet || config?.isPaused;
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
    const nextPrizePool = liveTotalForThisRound;
    return (
      <div className="flex-1 glass h-[300px] flex flex-col justify-between gap-[13px] rounded-[20px] px-[19px] py-[8.5px]">
        <div className="flex flex-col items-center gap-[7px]">
          <Image
            alt="Solana Background"
            src={SolanaBg || "/placeholder.svg"}
            className="rounded-[10px] w-[215px] h-[132px] object-cover"
            width={215}
            height={142}
          />
          <div className="flex justify-between gap-1 font-semibold text-[16px] w-full">
            <p>{t("prizePool")}</p>
            <p>{formatNum(nextPrizePool)} SOL</p>
          </div>
        </div>

        {!connected ? (
          <div className=" mx-auto my-8">
            <WalletMultiButton
              style={{
                background:
                  "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)",
                width: "100%",
                height: "auto",
                borderRadius: "20px",
                fontWeight: "600",
                fontSize: "12px",
                padding: "0px 10px"
              }}
              className="!w-full !h-10  !rounded-full !font-semibold"
            >
              {t("closed.title")}
            </WalletMultiButton>
          </div>
        ) : (
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
              className={`glass flex flex-col gap-4 md:py-[16px] py-2 ${
                buttonDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:opacity-80"
              }`}
              disabled={buttonDisabled}
            >
              <>{t("isUp")}</>
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
              className={`glass flex flex-col gap-4  md:py-[16px] py-2 ${
                buttonDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:opacity-80"
              }`}
              disabled={buttonDisabled}
            >
              <>{t("isDown")}</>
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderLaterRoundContent = () => {
    if (variant !== "later") return null;

    const baseRemaining = timeLeft || 0;
    const totalSeconds =
      variant === "later"
        ? baseRemaining
        : baseRemaining + (config?.lockDuration || 180);

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
          <p className="font-semibold text-[20px]">
            <>{t("next")}</>
          </p>
        </div>
        <p className="font-semibold text-[35px]">{display}</p>
      </div>
    );
  };

  const renderLiveRoundContent = () => {
    if (variant !== "live") return null;

    const getPriceTextStyle = () => {
      return `text-sm md:text-[20px] ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-900"
      }`;
    };

    const getContentTextStyle = () => {
      return `font-semibold ${
        theme === "dark" ? "text-[#FEFEFE]" : "text-gray-800"
      }`;
    };

    const getLabelTextStyle = () => {
      return `text-[12px] ${
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
            <div className="flex flex-col items-center gap-3 justify-center h-[280px]">
              <DotLoader
                color={theme === "light" ? "#000" : "#ffffff"}
                size={40}
                aria-label="Loading Spinner"
                data-testid="loader"
              />
              <h2 className="text-lg md:text-2xl font-semibold mt-4 text-center">
                {t("calculating")}...
              </h2>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-[300px] bg-red-400 glass p-[10px] rounded-[20px] items-center">
            <div className=" flex flex-col  gap-[13px] w-[90%] justify-between flex-1">
              <Image
                alt="Solana Background"
                src={SolanaBg || "/placeholder.svg"}
                className="rounded-[10px] w-full h-[132px] object-cover"
                width={215}
                height={142}
              />
              <div
                className={`flex flex-col gap-[22px] font-semibold ${getContentTextStyle()}`}
              >
                <div className="flex gap-4 justify-between">
                  <NumberFlow
                    value={formattedRoundData.currentPrice}
                    format={{
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    }}
                    className={`${getPriceTextStyle()} ${
                      priceDirection === "up" ? "text-green-500" : priceDirection === "down" ? "text-red-500" : "text-gray-500"
                    }`}
                    transformTiming={{
                      duration: 800,
                      easing: "ease-out",
                    }}
                  />
                  <div
                    className={`${getPriceDirectionBg()} flex items-center gap-[4px] ${
                      priceDirection === "up" ? "text-green-500" : priceDirection === "down" ? "text-red-500" : "text-gray-500"
                    } px-[10px] py-[10px] rounded-[5px]`}
                  >
                    {priceDirection === "up" ? <ArrowUp size={12} /> : priceDirection === "down" && <ArrowDown size={12} /> }
                    <p className="text-[12px]">${formatNum(priceDifference)}</p>
                  </div>
                </div>
                <div
                  className={`flex justify-between items-center ${getLabelTextStyle()}`}
                >
                  <p>{t("lockedPrice")}</p>
                  <p>${formatNum(formattedRoundData.lockPrice)}</p>
                </div>
                <div className="flex justify-between text-[16px]">
                  <p>{t("prizePool")}</p>
                  <p>{formatNum(formattedRoundData.prizePool)} SOL</p>
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
      return `text-sm md:text-[20px] ${
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
                ${formatNum(formattedRoundData.closePrice)}
              </p>
              <div
                className={`${getPriceDirectionBg()} flex items-center gap-[4px] ${
                  priceDirection === "up" ? "text-green-500" : "text-red-500"
                } px-[10px] py-[5px] rounded-[5px]`}
              >
                {priceDirection === "up" ? <ArrowUp size={12} /> : priceDirection === "down" && <ArrowDown size={12} /> }
                <p className="text-[10px]">${formatNum(priceDifference)}</p>
              </div>
            </div>
            <div
              className={`flex justify-between items-center ${getLabelTextStyle()}`}
            >
              <p>{t("lockedPrice")}</p>
              <p>${formatNum(formattedRoundData.lockPrice)}</p>
            </div>
            <div className="flex justify-between text-[16px]">
              <p>{t("prizePool")}</p>
              <p>{formatNum(formattedRoundData.prizePool)} SOL</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!roundData && variant !== "later" && variant !== "next")
    return <div>No round data available</div>;

const didWin = useMemo(() => {
  if (variant !== "expired" || !isClaimable || !userBetStatus || hasLocallyClaimed) {
    return false;
  }
  
  // Check if user actually won by comparing bet direction with price direction
  const userWon = userBetStatus.direction === priceDirection && userBetStatus.status === "WON";
  
  // Additional validation: ensure there's actually a payout to claim
  const hasClaimablePayout = claimableBets?.some(bet => bet.roundNumber === roundId && bet.payout > 0);
  
  return userWon && hasClaimablePayout;
}, [
  variant,
  isClaimable, 
  userBetStatus,
  hasLocallyClaimed,
  priceDirection,
  claimableBets,
  roundId
]);
  return (
    <div
      className={`
        relative
          card_container rounded-[18px]
          my-8
          ${
            variant === "expired"
              ? "opacity-50 glass cursor-not-allowed hover:opacity-80 "
              : ""
          }
          ${
            variant === "expired" && isClaimable && userBetStatus
              ? "cursor-pointer hover:opacity-80 opacity-90 glass"
              : ""
          }
          ${variant === "live" ? "gradient-border glass rounded-[22px] " : ""}
          ${
            variant === "next"
              ? "bg-blue-50   rounded-[20px] glass border border-blue-300"
              : ""
          }
        `}
    >
      <div
        className={` ${
          theme === "light" ? "bg-[#fffffff1]" : "bg-[#2a2a4c]"
        }  rounded-[20px] min-w-[220px] sm:min-w-[223px] w-full p-4`}
      >
        <div
          className={`${
            isFlipped ? "hidden" : "flex"
          } flex-col justify-between gap-[10px]`}
        >
          <div
            className={`${
              variant === "expired" ? "opacity-50" : ""
            } flex flex-col`}
          >
            <div className="flex justify-between items-center font-semibold text-[20px]">
              <div className="flex items-center gap-[10px]">
                {variant === "expired" ? (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      width="21px"
                      fill="white"
                      className="text-white"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22ZM12 4C16.42 4 20 7.58 20 12C20 13.85 19.37 15.55 18.31 16.9L7.1 5.69C8.45 4.63 10.15 4 12 4ZM5.69 7.1L16.9 18.31C15.55 19.37 13.85 20 12 20C7.58 20 4 16.42 4 12C4 10.15 4.63 8.45 5.69 7.1Z"></path>
                    </svg>
                    <p className="capitalize">{variant}</p>
                  </>
                ) : variant === "live" ? (
                  <>
                    <SVG width={18} height={18} iconName="play-fill" />
                    <p className="capitalize">{variant}</p>
                    <div className="rounded-full size-3 animate-pulse bg-green-600"></div>
                  </>
                ) : variant === "next" ? (
                  <>
                    <SVG width={18} height={18} iconName="play-fill" />
                    <p className="capitalize">{variant}</p>
                  </>
                ) : (
                  <>
                    <SVG width={18} height={18} iconName="clock" />
                    <p className="capitalize">{variant}</p>
                  </>
                )}
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
                        i <
                        Math.floor(
                          (((config?.lockDuration || 180) - (timeLeft || 0)) /
                            (config?.lockDuration || 180)) *
                            7
                        )
                          ? theme === "dark"
                            ? "#E5E7EB"
                            : "#6B7280"
                          : theme === "dark"
                          ? "#6B7280"
                          : "#E5E7EB",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          {didWin && (
            <div
              className={`
                        ${
                          theme === "dark"
                            ? " text-green-200"
                            : " text-green-800 "
                        }
                         glass
                  mt-1 px-2 py-1 mx-auto left-[30px] rounded-2xl z-10 w-[80%]  h-[50px] flex items-center justify-center opacity-100  absolute top-[220px] text-sm font-semibold cursor-pointer`}
              onClick={() => {
                setClaimLoading(true);
                window.dispatchEvent(new CustomEvent("claimAll"));
              }}
            >
              {isClaiming ? (
                <PuffLoader color="#06C729" size={24} />
              ) : (
                <span className="animate-bounce uppercase">
                  🎉 {t("reward")}
                </span>
              )}
            </div>
          )}
          <Button
            style={{ background: getButtonStyle("up") }}
            className={`glass flex flex-col gap-4 py-[16px] ${
              variant === "expired" ||
              (variant === "live" && priceDirection === "up")
                ? "border-2 border-green-500"
                : ""
            } `}
          >
            <div className="flex justify-center uppercase items-center gap-2">
              {hasUserBet &&
              userBetStatus?.direction === "up" &&
              betValue !== null ? (
                <p className="text-[20px] font-[600] leading-0">
                  {t("up")}&nbsp;&middot;&nbsp;{formatNum(betValue)}&nbsp;SOL
                </p>
              ) : (
                <p className="text-[20px] font-[600] leading-0">{t("up")}</p>
              )}
            </div>
            <p className="text-[10px] font-[600] leading-0">
              {bullMultiplier}x {t("payout")}
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
            <div className="flex justify-center uppercase items-center gap-2">
              {hasUserBet &&
              userBetStatus?.direction === "down" &&
              betValue !== null ? (
                <p className="text-[20px] font-[600] leading-0">
                  {t("down")}&nbsp;&middot;&nbsp;{formatNum(betValue)}&nbsp;SOL
                </p>
              ) : (
                <p className="text-[20px] font-[600] leading-0">{t("down")}</p>
              )}
            </div>
            <p className="text-[10px] font-[600] leading-0">
              {bearMultiplier}x {t("payout")}
            </p>
          </Button>
        </div>
        <div className={`${isFlipped ? "flex" : "hidden"} flex-col gap-[26px]`}>
          <div className="flex gap-2 items-center font-semibold text-[16px]">
            <SVG
              className="cursor-pointer"
              iconName="arrow-left"
              onClick={() => {
                setIsFlipped(false)
                setAmount(defaultBet);
                setInputValue(defaultBet.toString());
              }}
            />
            <p>{t("placeOrder")}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="font-semibold text-[16px]">{t("amount")}</p>
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
            type="text"
            value={inputValue}
            disabled={!connected}
            placeholder="Enter Value:"
            onChange={(e) => {
              if (!connected) return;
              const raw = e.target.value;
              // allow blank or a number with up to 10 decimals
              if (raw === "" || /^(?:0|[1-9]\d*)(?:\.\d{0,10})?$/.test(raw)) {
                setInputValue(raw);

                // parse and clamp amount, but do NOT overwrite inputValue
                const parsed = parseFloat(raw);
                if (!isNaN(parsed) && parsed > 0) {
                  const clamped = Math.min(parsed, maxAmount);
                  setAmount(clamped);
                } else {
                  setAmount(0);
                }
              }
            }}
            onBlur={() => {
              if (!connected) return;
            }} 
            className={`glass h-[65px] text-right rounded-[20px] pr-4 font-semibold text-[16px] outline-0 ${
              !connected ? "opacity-50 cursor-not-allowed bg-gray-200" : ""
            }`}
          />

          {inputError && (
            <p className="mt-1 text-red-500 text-sm">{inputError}</p>
          )}
          <input
            type="range"
            min={minBet}
            max={maxAmount}
            step={step}
            style={{
              cursor: connected ? "pointer" : "not-allowed",
            }}
            disabled={!connected}
            value={amount}
            onChange={(e) => {
              if (!connected) return;
              let value = parseFloat(e.target.value);
              value = Math.max(minBet, Math.min(value, maxAmount));
              setAmount(value);
              setInputValue(String(value));
            }}
            className={`w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer my-5 accent-gray-500 custom-slider ${
              !connected ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <div className="flex gap-y-[12px] gap-x-[4px] justify-between flex-wrap">
            {CUSTOM_INPUTS.map((el, key) => (
              <div
                className={`glass py-[6px] px-[9px] rounded-[20px] font-semibold text-[10px] ${
                  connected ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
                key={key}
                onClick={() => connected && handleCustomAmount(el.value)}
              >
                {el.label}
              </div>
            ))}
          </div>
          <div className="w-full">
            {!connected ? (
              <WalletMultiButton
                style={{
                  background: "#9CA3AF",
                  width: "100%",
                  height: "48px",
                  borderRadius: "12px",
                  fontWeight: "600",
                }}
                className="!w-full !h-12 !rounded-xl !font-semibold"
              />
            ) : (
              <Button
                disabled={buyDisabled}
                style={{
                  cursor: buyDisabled ? "not-allowed" : "pointer",
                  background: buyDisabled
                    ? "#9CA3AF"
                    : mode === "up"
                    ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
                    : mode === "down"
                    ? "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)"
                    : "",
                }}
                className="w-full cursor-pointer flex items-center justify-center"
                onClick={handlePlaceBet}
              >
                {isSubmitting ? (
                  <PuffLoader color="#ffffff" size={20} />
                ) : (
                  <>Confirm</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

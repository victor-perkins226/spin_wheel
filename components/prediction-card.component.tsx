"use client"

import { useState, useEffect } from "react"
import Button from "./button.component"
import SVG from "./svg.component"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"
import SolanaBg from "@/public/assets/solana_bg.png"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { ArrowDown, ArrowUp } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useConfig, usePreviousRounds, useRound } from "@/hooks/useConfig"

interface IProps {
  variant?: "live" | "expired" | "next" | "later"
  roundId?: number
  roundData?: {
    lockPrice?: number
    currentPrice?: number
    closePrice?: number
    endTime?: number
    prizePool?: number
    timeRemaining?: number
    lockTimeRemaining?: number
    upBets?: number
    downBets?: number
    upPayout?: number // Added for dynamic payout calculation
    downPayout?: number // Added for dynamic payout calculation
    status?: "LIVE" | "LOCKED" | "ENDED" ;
  }
  onPlaceBet?: (direction: "up" | "down", amount: number, roundId: number) => void
  currentRoundId?: number
  bufferTimeInSeconds?: number
  isRoundBettable?: (roundId: number) => boolean
  liveRoundPrice?: number // Added to compare with ended round price
  userBetDirection?: "up" | "down" | null // Added to show user's bet
  userBetStatus?: "WON" | "LOST" | "PENDING" | null // Added to show bet status
  userBets?: any[];
  isLocked: boolean;
}

const CUSTOM_INPUTS = [
  { label: "10%", value: 0.1 },
  { label: "25%", value: 0.25 },
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "Max", value: 1.0 },
]

export default function PredictionCard({
  variant = "expired",
  roundId,
  onPlaceBet,
  currentRoundId,
  bufferTimeInSeconds = 30,
  isRoundBettable,
  liveRoundPrice,
  userBets,
  isLocked,
}: IProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"up" | "down" | "">("");
  const [amount, setAmount] = useState<number>(0.1);
  const [maxAmount, setMaxAmount] = useState<number>(10);
  const { connected, publicKey } = useWallet();
  const queryClient = useQueryClient();

  // Fetch config and round data
  const { data: config } = useConfig();
  const { data: roundData, isLoading } = useRound(roundId);
  const { data: previousRoundsData } = usePreviousRounds(config?.currentRound);

  // Poll for new round after lockTime
  useEffect(() => {
    if (!roundData || !config?.roundDuration || variant !== "live") return;

    const now = Date.now() / 1000;
    const lockTime = roundData.lockTime;
    const timeUntilLock = (lockTime - now) * 1000;

    if (timeUntilLock > 0) {
      const timer = setTimeout(() => {
        queryClient.invalidateQueries(["config"]);
        queryClient.invalidateQueries(["previousRounds"]);
      }, timeUntilLock + 1000);

      return () => clearTimeout(timer);
    }
  }, [roundData, config?.roundDuration, queryClient, variant]);

  // Wallet balance
  useEffect(() => {
    if (connected && publicKey) {
      // TODO: Fetch actual SOL balance
      setMaxAmount(10);
    }
  }, [connected, publicKey]);

  // User bet status
  const userBetStatus = userBets?.find((bet) => bet.roundId === roundId) || null;

  // Calculate price movement and direction
  const getPriceMovement = () => {
    if (!roundData) return { difference: 0, direction: "up" as "up" | "down" };

    const currentPrice =
      variant === "expired" && roundData.endPrice > 0
        ? roundData.endPrice / 1e8
        : liveRoundPrice || roundData.lockPrice / 1e8;
    const lockPrice = roundData.lockPrice / 1e8;

    const difference = Math.abs(currentPrice - lockPrice);
    const direction = currentPrice >= lockPrice ? "up" : "down";

    return { difference, direction };
  };

  const { difference: priceDifference, direction: priceDirection } = getPriceMovement();

  // Calculate payouts
  const calculatePayout = (direction: "up" | "down") => {
    if (!roundData || !roundData.totalAmount || roundData.totalAmount === 0) return 2.51;

    const directionAmount =
      direction === "up" ? roundData.totalBullAmount : roundData.totalBearAmount;
    if (!directionAmount || directionAmount === 0) return 2.51;

    const fee = config?.treasuryFee ? config.treasuryFee / 10000 : 0.03; // Default 3%
    return (roundData.totalAmount * (1 - fee)) / directionAmount / 1e9; // Convert lamports to SOL
  };

  const upPayout = calculatePayout("up");
  const downPayout = calculatePayout("down");

  // Determine if round is bettable
  const canBet =
    variant === "live" &&
    roundData?.isActive &&  !isLocked &&
    roundId === (currentRoundId || 0) + 1 &&
    Date.now() / 1000 < roundData.lockTime - bufferTimeInSeconds;

    // const canBet = variant === "live" && roundData.status === "LIVE" && !isLocked && roundData.lockTimeRemaining > bufferTimeInSeconds;

  // Map roundData to component's expected format
  const formattedRoundData = roundData
    ? {
      lockPrice: roundData.lockPrice / 1e8, // Convert to USD
      closePrice:
        roundData.endPrice > 0 ? roundData.endPrice / 1e8 : liveRoundPrice || roundData.lockPrice / 1e8,
      currentPrice: liveRoundPrice || roundData.lockPrice / 1e8,
      prizePool: roundData.totalAmount / LAMPORTS_PER_SOL,
      upBets: roundData.totalBullAmount / LAMPORTS_PER_SOL,
      downBets: roundData.totalBearAmount / LAMPORTS_PER_SOL,
      upPayout,
      downPayout,
      endTime: roundData.closeTime,
      lockTimeRemaining: Math.max(0, roundData.lockTime - Date.now() / 1000),
      timeRemaining: Math.max(0, roundData.closeTime - Date.now() / 1000),
      status: roundData.isActive
        ? Date.now() / 1000 < roundData.lockTime
          ? "LIVE"
          : "LOCKED"
        : "ENDED",
    }
    : {
      lockPrice: 0,
      closePrice: liveRoundPrice || 0,
      currentPrice: liveRoundPrice || 0,
      prizePool: 0,
      upBets: 0,
      downBets: 0,
      upPayout: 2.51,
      downPayout: 2.51,
      endTime: 0,
      lockTimeRemaining: 0,
      timeRemaining: 0,
      status: "ENDED" as const,
    };





  // useEffect(() => {
  //   isMounted.current = true
  //   return () => {
  //     isMounted.current = false
  //   }
  // }, [])

  // useEffect(() => {
  //   if (!userBets) return
  //   const betStatus = userBets.find((bet) => bet.roundId === roundId)
  //   setUserBetsStatus(betStatus || null)
  // }, [userBets, roundId])

  // // Fetch round data from API with caching and throttling
  // useEffect(() => {
  //   // Only fetch data for live or expired rounds
  //   if (variant !== "live" && variant !== "expired") {
  //     return
  //   }

  //   const fetchRoundData = async () => {
  //     // Check if we need to fetch (first time or more than interval since last fetch)
  //     const now = Date.now()
  //     if (now - lastFetchTime.current < FETCH_INTERVAL && roundData) {
  //       return
  //     }

  //     setIsLoading(true)
  //     try {
  //       // Fetch current round data
  //       const data = await fetchRoundDetails(roundId)
  //       if (!data) {
  //         throw new Error("Failed to fetch round data")
  //       }

  //       lastFetchTime.current = now

  //       // Fetch previous round data for comparison (only if needed)
  //       let prevData = prevRoundData
  //       if (!prevRoundData) {
  //         const prevRoundId = roundId - 1
  //         if (prevRoundId > 0) {
  //           prevData = await fetchRoundDetails(prevRoundId)
  //           if (prevData && isMounted.current) {
  //             setPrevRoundData(prevData)
  //           }
  //         }
  //       }

  //       if (prevData) {
  //         // Calculate price difference between rounds
  //         const currentEndPrice = data?.endPrice && data.endPrice > 0 ? Number(data.endPrice) : liveRoundPrice
  //         const prevEndPrice = prevData?.endPrice && prevData.endPrice > 0 ? Number(prevData.endPrice) : liveRoundPrice
  //         const diff = Math.abs(currentEndPrice - prevEndPrice)

  //         if (isMounted.current) {
  //           setPriceDifference(diff)
  //           setPriceDirection(currentEndPrice >= prevEndPrice ? "up" : "down")
  //         }
  //       }

  //       // Convert and format the data
  //       const formattedData = {
  //         ...roundData,
  //         lockPrice: Number(data.lockPrice),
  //         closePrice: data?.endPrice > 0 ? Number(data.endPrice) : liveRoundPrice,
  //         currentPrice: liveRoundPrice || Number(data.lockPrice),
  //         prizePool: Number(data.totalAmount) / LAMPORTS_PER_SOL,
  //         upBets: Number(data.totalBullAmount) / LAMPORTS_PER_SOL,
  //         downBets: Number(data.totalBearAmount) / LAMPORTS_PER_SOL,
  //         // Calculate payouts based on bet amounts if needed
  //         upPayout: calculatePayout("up", Number(data.totalBullAmount), Number(data.totalAmount)),
  //         downPayout: calculatePayout("down", Number(data.totalBearAmount), Number(data.totalAmount)),
  //       }

  //       if (isMounted.current) {
  //         setRoundData(formattedData)
  //       }
  //     } catch (error) {
  //       console.error("Error fetching round data:", error)
  //       // Keep using the initial data if API call fails
  //     } finally {
  //       if (isMounted.current) {
  //         setIsLoading(false)
  //       }
  //     }
  //   }

  //   fetchRoundData()

  //   // Set up polling for live rounds - less frequent than before
  //   let intervalId
  //   if (variant === "live") {
  //     intervalId = setInterval(fetchRoundData, FETCH_INTERVAL)
  //   }

  //   return () => {
  //     if (intervalId) clearInterval(intervalId)
  //   }
  // }, [variant, roundId, liveRoundPrice, prevRoundData, roundData])

  // // Helper function to calculate payouts
  // const calculatePayout = (direction, directionAmount, totalAmount) => {
  //   if (!totalAmount || totalAmount === 0 || !directionAmount || directionAmount === 0) {
  //     return 2.51 // Default payout
  //   }

  //   // Calculate a payout multiplier based on the bet distribution
  //   // Formula: (TotalAmount * 0.97) / DirectionAmount
  //   // The 0.97 accounts for a hypothetical 3% platform fee
  //   return (totalAmount * 0.97) / directionAmount
  // }


  // Determine price movement direction
  // const getPriceMovement = () => {
  //   // For expired rounds, compare with previous round
  //   if (variant === "expired" && prevRoundData && roundData?.closePrice) {
  //     const prevEndPrice = Number(prevRoundData.endPrice || 0)
  //     const currentEndPrice = roundData.closePrice
  //     return currentEndPrice > prevEndPrice ? "up" : "down"
  //   }

  //   // For live rounds, compare with current round's lock price
  //   if (variant === "live" && roundData?.closePrice && roundData?.lockPrice) {
  //     return roundData?.closePrice > roundData.lockPrice ? "up" : "down"
  //   }

  //   return null
  // }

  // const priceMovement = getPriceMovement()

  // Determine if this round can be bet on - with reduced API calls
  // useEffect(() => {
  //   const checkBetEligibility = async () => {
  //     if (isRoundBettable && roundId) {
  //       setCanBet(isRoundBettable(roundId))
  //     } else if (roundId) {
  //       // Only check if we haven't determined bettability yet
  //       if (canBet === false) {
  //         try {
  //           const roundData = await fetchRoundDetails(roundId)

  //           if (!roundData) {
  //             setCanBet(false)
  //             return
  //           }

  //           const isNextRound = roundId === (currentRoundId || 0) + 1
  //           const hasEnoughTimeLeft =
  //             initialRoundData?.timeRemaining && initialRoundData.timeRemaining > bufferTimeInSeconds

  //           const isActive = roundData?.isActive === true

  //           setCanBet(isNextRound && hasEnoughTimeLeft && isActive)
  //         } catch (error) {
  //           console.error("Failed to check round status:", error)
  //           setCanBet(false)
  //         }
  //       }
  //     } else {
  //       setCanBet(false)
  //     }
  //   }

  //   checkBetEligibility()
  // }, [roundId, currentRoundId, initialRoundData?.timeRemaining, bufferTimeInSeconds, isRoundBettable, canBet])

  // Handle wallet balance
  useEffect(() => {
    if (connected && publicKey) {
      // In a real application, you would fetch the user's SOL balance here
      // For now, we'll just set a default max amount
      setMaxAmount(10)
    }
  }, [connected, publicKey])

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

  // Generate button style based on variant and price movement
  const getButtonStyle = (direction: "up" | "down") => {
    if (variant === "expired" || variant === "live") {
      // For expired rounds, highlight the winning direction
      if (priceDirection === direction) {
        return direction === "up"
          ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
          : "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)"
      } else {
        return "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)"
      }
    }
  }

  const isLockPhase = roundData && Date.now() / 1000 >= roundData.lockTime && Date.now() / 1000 < roundData.closeTime;

  const renderNextRoundContent = () => {
    if (variant !== "next") return null;
    return (
      <div className="flex-1 glass flex flex-col justify-between gap-[13px] rounded-[20px] px-[19px] py-[8.5px]">
        <div className="flex flex-col items-center gap-[7px]">
          <Image
            alt="Solana Background"
            src={SolanaBg || "/placeholder.svg"}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
            width={215}
            height={142}
          />
          <div className="flex justify-between gap-1 font-semibold text-[16px]">
            <p>Prize Pool</p>
            <p>{formattedRoundData.prizePool.toFixed(4)} SOL</p>
          </div>
        </div>
        {canBet ? (
          <>
            <Button
              style={{ background: "linear-gradient(90deg, #06C729 0%, #04801B 100%)" }}
              onClick={() => handleEnterPrediction("up")}
              className="cursor-pointer"
            >
              Enter UP
            </Button>
            <Button
              style={{ background: "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)" }}
              onClick={() => handleEnterPrediction("down")}
              className="cursor-pointer"
            >
              Enter DOWN
            </Button>
          </>
        ) : (
          <div className="text-center py-3 font-semibold">Betting closed for this round</div>
        )}
      </div>
    );
  };

  // Render later round content (waiting for entry phase)
  const renderLaterRoundContent = () => {
    if (variant !== "later") return null;
    return (
      <div className="glass flex-1 rounded-[20px] flex flex-col gap-[12px] items-center justify-center">
        <Image
          alt="Solana Background"
          src={SolanaBg || "/placeholder.svg"}
          className="rounded-[10px] w-[215px] h-[142px] object-cover mt-2"
          width={215}
          height={142}
        />
        <div className="flex items-center gap-[12px]">
          <SVG iconName="play-fill" />
          <p className="font-semibold text-[20px]">Next Play</p>
        </div>
        <p className="font-semibold text-[35px]">
          {formattedRoundData.timeRemaining > 0
            ? new Date(formattedRoundData.timeRemaining * 1000).toISOString().substr(11, 8)
            : "Waiting..."}
        </p>
      </div>
    );
  };

  const renderLiveRoundContent = () => {
    if (variant !== "live") return null;
    return (
      <div className="flex-1 flex flex-col glass p-[10px] rounded-[20px] items-center">
        <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
          <Image
            alt="Solana Background"
            src={SolanaBg || "/placeholder.svg"}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
            width={215}
            height={142}
          />
          <div className="flex flex-col gap-[22px] font-semibold text-[#FEFEFE]">
            <div className="flex justify-between">
              <p className="text-[20px]">${formattedRoundData.closePrice.toFixed(4)}</p>
              <div
                className={`bg-white flex items-center gap-[4px] ${priceDirection === "up" ? "text-green-500" : "text-red-500"
                  } px-[10px] py-[5px] rounded-[5px]`}
              >
                {priceDirection === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                <p className="text-[10px]">${priceDifference.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <p>Locked Price</p>
              <p>${formattedRoundData.lockPrice.toFixed(4)}</p>
            </div>
            <div className="flex justify-between text-[16px]">
              <p>Prize Pool</p>
              <p>{formattedRoundData.prizePool.toFixed(4)} SOL</p>
            </div>
            {isLockPhase && <div className="text-center text-yellow-400 font-bold">LOCKED</div>}
          </div>
        </div>
      </div>
    );
  };


  const renderExpiredRoundContent = () => {
    if (variant !== "expired" && variant !== "locked") return null;
    return (
      <div className="flex-1 flex flex-col glass p-[10px] rounded-[20px] items-center opacity-80">
        <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
          <Image
            alt="Solana Background"
            src={SolanaBg || "/placeholder.svg"}
            className="rounded-[10px] w-[215px] h-[142px] object-cover"
            width={215}
            height={142}
          />
          <div className="flex flex-col gap-[22px] font-semibold text-[#FEFEFE]">
            <div className="flex justify-between">
              <p className="text-[20px]">${formattedRoundData.closePrice.toFixed(4)}</p>
              <div
                className={`bg-white flex items-center gap-[4px] ${
                  priceDirection === "up" ? "text-green-500" : "text-red-500"
                } px-[10px] py-[5px] rounded-[5px]`}
              >
                {priceDirection === "up" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                <p className="text-[10px]">${priceDifference.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <p>Locked Price</p>
              <p>${formattedRoundData.lockPrice.toFixed(4)}</p>
            </div>
            <div className="flex justify-between text-[16px]">
              <p>Prize Pool</p>
              <p>{formattedRoundData.prizePool.toFixed(4)} SOL</p>
            </div>
            {userBetStatus && (
              <div
                className={`flex justify-center text-[16px] font-bold ${
                  userBetStatus.status === "WON"
                    ? "text-green-500"
                    : userBetStatus.status === "LOST"
                      ? "text-red-500"
                    : "text-white"
                }`}
              >
                <p>{userBetStatus.status}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (!roundData && variant !== "later") return <div>No round data available</div>;

  return (
    <div
      className={`card_container glass rounded-[20px] p-[15px] sm:p-[25px] ${
        variant === "live" ? "min-w-[280px] sm:min-w-[320px] md:min-w-[380px]" : "min-w-[240px] sm:min-w-[273px] w-full"
      }`}
    >
      <div className={`${isFlipped ? "hidden" : "flex"} flex-col justify-between gap-[10px]`}>
        <div className={`${variant === "expired" ? "opacity-80" : ""} flex justify-between font-semibold text-[20px]`}>
          <div className="flex items-center gap-[10px]">
            <SVG width={12} height={12} iconName="play-fill" />
            <p className="capitalize">{variant ?? "Expired"}</p>
          </div>
          <p>#{roundId}</p>
        </div>
        <Button
          style={{ background: getButtonStyle("up") }}
          className={`glass flex flex-col gap-4 py-[16px] ${
            variant === "expired" || (variant === "live" && priceDirection === "up") ? "border-2 border-green-500" : ""
          } `}
        >
          <div className="flex justify-center items-center gap-2">
            <p className="text-[20px] font-[600] leading-0">UP</p>
            {userBetStatus && userBetStatus.direction === "up" && (
              <span
                className={`text-[12px] font-bold ml-2 ${
                  userBetStatus.status === "WON"
                    ? "text-green-500"
                    : userBetStatus.status === "LOST"
                      ? "text-red-500"
                    : "text-yellow-400"
                }`}
              >
                {userBetStatus.status}
              </span>
            )}
          </div>
          <p className="text-[10px] font-[600] leading-0">{upPayout.toFixed(2)}x payout</p>
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
            variant === "expired" || (variant === "live" && priceDirection === "down") ? "border-2 border-red-500" : ""
          }`}
        >
          <div className="flex justify-center items-center gap-2">
            <p className="text-[20px] font-[600] leading-0">DOWN</p>
            {userBetStatus && userBetStatus.direction === "down" && (
              <span
                className={`text-[12px] font-bold ml-2 ${
                  userBetStatus.status === "WON"
                    ? "text-green-500"
                    : userBetStatus.status === "LOST"
                      ? "text-red-500"
                    : "text-yellow-400"
                }`}
              >
                {userBetStatus.status}
              </span>
            )}
          </div>
          <p className="text-[10px] font-[600] leading-0">{downPayout.toFixed(2)}x payout</p>
        </Button>
      </div>
      <div className={`${isFlipped ? "flex" : "hidden"} flex-col gap-[26px]`}>
        <div className="flex gap-2 items-center font-semibold text-[16px]">
          <SVG className="cursor-pointer" iconName="arrow-left" onClick={() => setIsFlipped(false)} />
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
        <Button onClick={handlePlaceBet}>
          Buy {mode?.toUpperCase()} for {amount} SOL
        </Button>
      </div>
    </div>
  );
}

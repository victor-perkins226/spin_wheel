// components/MarketHeader.tsx
import React, { useMemo } from "react";
import Image from "next/image";
import NumberFlow from "@number-flow/react";
import { PuffLoader } from "react-spinners";

export interface MarketHeaderProps {
  /** Latest SOL/USDT price (as a number, e.g. 172.5234) */
  liveRoundPrice: number;

  /** CSS class for price color (e.g. "text-green-500" or "text-red-500" or default "text-gray-900") */
  priceColor: string;

  /** Whether the current round is locked (so we show “Closing”) */
  isLocked: boolean;

  /** Seconds remaining until lock (if unlocked), or null */
  timeLeft: number | null;

  /** Lock duration (in seconds) from your config (e.g. 180) */
  lockDuration: number;

  /** “light” or “dark” (passed from next-themes) */
  theme: "light" | "dark";

  /** Whether the user’s wallet is connected */
  connected: boolean;

  /** User’s SPL balance, in SOL (e.g. 1.2345) */
  userBalance: number;

  /** Total unclaimed rewards, in SOL */
  claimableRewards: number;

  /** Whether a claim call is currently in flight (to disable the button & show a spinner) */
  isClaiming: boolean;

  /**
   * Called when the user clicks “Claim”.
   * The parent should wrap this in useCallback so it doesn’t change on every render.
   */
  onClaim: () => void;

  /**
   * Utility function to format a “seconds remaining” into MM:SS.
   * If you already have a shared helper, pass it in.
   * Eg: (sec) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`
   */
  formatTimeLeft: (seconds: number | null) => string;
}

const MarketHeader: React.FC<MarketHeaderProps> = React.memo(
  ({
    liveRoundPrice,
    priceColor,
    isLocked,
    timeLeft,
    lockDuration,
    theme,
    connected,
    userBalance,
    claimableRewards,
    isClaiming,
    onClaim,
    formatTimeLeft,
  }) => {
    //
    // Precompute some derived values so we don’t do it inside JSX repeatedly:
    //
    const displayTime = useMemo(() => {
      if (isLocked) return "Closing";
      return formatTimeLeft(timeLeft);
    }, [isLocked, timeLeft, formatTimeLeft]);

    const lockMinutes = useMemo(() => {
      return Math.floor(lockDuration / 60);
    }, [lockDuration]);

    return (
      <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
        {/* ─────── SOL/USDT Price + Timer Row ─────── */}
        <div className="flex justify-between items-center flex-wrap gap-4 md:gap-4">
          {/* Price Display */}
          <div className="relative">
            <Image
              src="/assets/solana_logo.png"
              alt="Solana"
              width={64}
              height={64}
              className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
            />
            <div className="glass flex gap-2 sm:gap-[9px] lg:gap-[26px] relative left-[8px] sm:left-[10px] lg:left-[20px] items-center font-semibold px-3 sm:px-[20px] lg:px-[44px] py-1 sm:py-[6px] lg:py-[15px] rounded-full">
              <p className="text-[10px] pl-4 sm:text-[12px] lg:text-[20px]">
                SOL/USDT
              </p>
              <p
                className={`text-[10px] sm:text-[12px] transition-colors duration-300 ${priceColor}`}
              >
                $
                <NumberFlow
                  value={liveRoundPrice}
                  format={{
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  }}
                  transformTiming={{
                    duration: 750,
                    easing: "ease-out",
                  }}
                />
              </p>
            </div>
          </div>

          {/* Circular Timer */}
          <div className="relative flex items-center justify-center w-[60px] sm:w-[80px] lg:w-[120px] h-[60px] sm:h-[80px] lg:h-[120px]">
            {/* Background Circle */}
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={theme === "dark" ? "#374151" : "#E5E7EB"}
                strokeWidth="5"
              />

              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={theme === "dark" ? "#6B7280" : "#9CA3AF"}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="283" // 2πr ≈ 283
                strokeDashoffset={
                  isLocked
                    ? 0
                    : 283 - 283 * (1 - (timeLeft ?? 0) / lockDuration)
                }
                transform="rotate(-90 50 50)"
              />

              {/* Tick Marks */}
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = 15 + i * 18; // 15° + 18° increments
                if (angle < 165 || angle > 195) {
                  return (
                    <line
                      key={i}
                      x1="50"
                      y1="8"
                      x2="50"
                      y2="12"
                      stroke={theme === "dark" ? "#4B5563" : "#6B7280"}
                      strokeWidth="1.5"
                      transform={`rotate(${angle} 50 50)`}
                    />
                  );
                }
                return null;
              })}
            </svg>

            {/* Center Text */}
            <div className="absolute flex flex-col items-center justify-center z-10">
              <span
                className={`font-semibold text-[12px] sm:text-[16px] lg:text-[24px] ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {displayTime}
              </span>
              <span
                className={`text-[8px] sm:text-[10px] lg:text-[12px] ${
                  theme === "dark" ? "text-[#D1D5DB]" : "text-gray-500"
                }`}
              >
                {lockMinutes}m
              </span>
            </div>
          </div>
        </div>

        {/* ─────── Balance & Claim Panel ─────── */}
        {connected ? (
          <div className="glass rounded-xl p-4 flex justify-between items-center flex-wrap gap-4">
            {/* User Balance */}
            <div>
              <p className="text-sm opacity-70">Your Balance</p>
              <div className="flex items-center gap-1 font-semibold">
                <Image
                  src="/assets/solana_logo.png"
                  alt="Solana"
                  width={20}
                  height={20}
                  className="w-[20px] h-auto object-contain"
                />
                <span>{userBalance.toFixed(4)} SOL</span>
              </div>
            </div>

            {/* Claimable Rewards & Button */}
            {claimableRewards > 0 && (
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm opacity-70">Unclaimed Rewards</p>
                  <div className="flex items-center gap-1 font-semibold text-green-500">
                    <Image
                      src="/assets/solana_logo.png"
                      alt="Solana"
                      width={20}
                      height={20}
                      className="w-[20px] h-auto object-contain"
                    />
                    <span>{claimableRewards.toFixed(4)} SOL</span>
                  </div>
                </div>
                <button
                  className="glass bg-green-500 cursor-pointer py-2 px-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
                  onClick={onClaim}
                  disabled={claimableRewards === 0 || isClaiming}
                >
                  {isClaiming ? (
                    <PuffLoader size={20} color="#fff" />
                  ) : (
                    "Claim"
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl p-4 flex justify-center items-center">
            <p className="text-sm opacity-70">
              Connect your wallet to place bets and view your balance
            </p>
          </div>
        )}
      </div>
    );
  }
);

MarketHeader.displayName = "MarketHeader";
export default MarketHeader;

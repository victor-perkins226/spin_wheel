import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import NumberFlow from "@number-flow/react";
import { PuffLoader } from "react-spinners";
import { formatNum } from "@/lib/utils";
import { useTranslation } from "next-i18next";
import axios from "axios";
import coinIcon from "@/public/assets/solana_logo.png";
import { useWallet } from "@solana/wallet-adapter-react";
import ShareReferral from "./ShareButton";

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

  /** Total cancelable rewards, in SOL */
  cancelableRewards: number;

  /** Whether a claim call is currently in flight (to disable the button & show a spinner) */
  isClaiming: boolean;

  /** Whether a cancel call is currently in flight (to disable the button & show a spinner) */
  isCancelling: boolean;

  /**
   * Called when the user clicks “Claim”.
   * The parent should wrap this in useCallback so it doesn’t change on every render.
   */
  onClaim: () => void;
  onCancel: () => void;
  registerBonusRefresh: (refresh: () => void) => void;
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
    cancelableRewards,
    isClaiming,
    isCancelling,
    onClaim,
    onCancel,
    formatTimeLeft,
    registerBonusRefresh,
  }) => {
    const { t } = useTranslation("common");
    const { publicKey } = useWallet();

    const [bonusAmount, setBonusAmount] = useState<number>(0);
    const [loadingBonus, setLoadingBonus] = useState<boolean>(false);
    const [lastFetchTime, setLastFetchTime] = useState<number>(0);

    const fetchBonus = useCallback(async () => {
      if (!connected || !publicKey) return;

      // Prevent multiple rapid fetches
      const now = Date.now();
      if (now - lastFetchTime < 2000) {
        // 2 second debounce
        return;
      }

      setLastFetchTime(now);

      try {
        const { data } = await axios.get<number>(
          `https://sol-prediction-backend-6e3r.onrender.com/user/bonus/${publicKey.toBase58()}`
        );
        setBonusAmount(data);
      } catch (err) {
        console.error("Failed to fetch bonus:", err);
      } finally {
      }
    }, [connected, publicKey, lastFetchTime]);

    // Register the refresh function with parent
    useEffect(() => {
      registerBonusRefresh(fetchBonus);
    }, [fetchBonus, registerBonusRefresh]);

    // Fetch bonus only on wallet connection change
    useEffect(() => {
      if (connected && publicKey) {
        setLoadingBonus(true);
        fetchBonus();
        setLoadingBonus(false);
      } else {
        setBonusAmount(0);
      }
    }, [connected, publicKey?.toBase58()]); // Use toBase58() to avoid unnecessary re-renders

    // Set up interval to fetch bonus every 10 seconds when connected
    useEffect(() => {
      if (!connected || !publicKey) return;

      const interval = setInterval(() => {
        fetchBonus();
      }, 10000); // 10 seconds

      return () => clearInterval(interval);
    }, [connected, publicKey, fetchBonus]);

    // Remove the claimableRewards dependency that was causing unnecessary refetches

    const displayTime = useMemo(() => {
      if (isLocked) return <>{t("closing")}</>;
      return formatTimeLeft(timeLeft);
    }, [isLocked, timeLeft, formatTimeLeft, t]);

    const lockMinutes = useMemo(() => {
      const safeDuration =
        typeof lockDuration === "number" && !isNaN(lockDuration)
          ? lockDuration
          : 0;
      return Math.floor(safeDuration / 60);
    }, [lockDuration]);

    return (
      <div className="flex flex-col gap-4 md:gap-4 lg:gap-[16px]">
        {/* ─────── SOL/USDT Price + Timer Row ─────── */}
        <div className="flex justify-between items-end flex-wrap gap-4 md:gap-4">
          {/* Price Display */}
          <div className="relative">
            <Image
              src={coinIcon}
              alt="Solana"
              width={64}
              height={64}
              className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
            />
            <div className="glass flex gap-2 sm:gap-[9px] lg:gap-[26px] relative left-[8px] sm:left-[10px] lg:left-[20px] items-center font-semibold px-3 sm:px-[20px] lg:px-[44px] py-1 sm:py-[6px] lg:py-[15px] rounded-full">
              <p className="text-[12px] pl-4 sm:text-[14px] lg:text-[20px]">
                SOL/USDT
              </p>
              {liveRoundPrice > 0 ? (
                <p
                  className={`text-[12px] sm:text-[14px] transition-colors duration-300 ${priceColor}`}
                >
                  $
                  <NumberFlow
                    value={liveRoundPrice}
                    format={{
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    }}
                    transformTiming={{
                      duration: 750,
                      easing: "ease-out",
                    }}
                  />
                </p>
              ) : (
                <PuffLoader
                  size={32}
                  color={theme === "dark" ? "#fff" : "#000"}
                />
              )}
            </div>
          </div>

          <div className="flex items-end gap-8">
            {
              connected &&
              <div className="flex flex-col items-center">
                <ShareReferral/>
              </div>
            }
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
                  className={`font-semibold text-[12px] sm:text-[16px] lg:text-[20px] ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {displayTime}
                </span>
                <span
                  className={`text-[8px] sm:text-[10px] lg:text-[14px] ${
                    theme === "dark" ? "text-[#D1D5DB]" : "text-gray-500"
                  }`}
                >
                  {lockMinutes === 0 ? <>{t("locked")}</> : <>{lockMinutes}m</>}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────── Balance & Claim Panel ─────── */}
        {connected ? (
          <div className="glass rounded-xl p-4 flex justify-between items-center flex-wrap gap-4">
            {/* User Balance */}
            <div className="flex gap-4">
              <div>
                <p className="text-sm opacity-70">{t("balance")}</p>
                <div className="flex items-center gap-1 font-semibold">
                  <Image
                    src={coinIcon}
                    alt="Solana"
                    width={20}
                    height={20}
                    className="w-[20px] h-auto object-contain"
                  />
                  <span>
                    {userBalance >= 0 ? (
                      formatNum(userBalance)
                    ) : (
                      <PuffLoader
                        size={32}
                        color={theme === "dark" ? "#fff" : "#000"}
                      />
                    )}{" "}
                    SOL
                  </span>
                </div>
              </div>
              <div className="relative border-l-2 pl-4 border-gray-300 group">
                <p className="text-sm opacity-70 cursor-help">{t("bonus")}</p>

                {/* tooltip panel */}
                <div className={`pointer-events-none absolute left-0 bottom-full mt-2 w-full md:w-64 ${theme === "dark" ? "bg-[#29294d] shadow-md border border-[#d1d1d1bb]" : "bg-white" }  rounded-md z-[100] p-3 text-sm opacity-0 transition-opacity group-hover:opacity-100`}>
                  <p className="whitespace-pre-line leading-snug">
                    {t("bonusExplanation")}
                  </p>
                </div>

                <div className="flex items-center gap-1 font-semibold">
                  {loadingBonus ? (
                    <PuffLoader
                      size={32}
                      color={theme === "dark" ? "#fff" : "#000"}
                    />
                  ) : (
                    <span>{formatNum(bonusAmount)} FN</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {/* Cancelable Rewards & Button */}
              {cancelableRewards > 0 && (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm opacity-70">{t("cancelable")}</p>
                    <div className="flex items-center gap-1 font-semibold text-green-500">
                      <Image
                        src={coinIcon}
                        alt="Solana"
                        width={20}
                        height={20}
                        className="w-[20px] h-auto object-contain"
                      />
                      <span>{formatNum(cancelableRewards)} SOL</span>
                    </div>
                  </div>
                  <button
                    className="glass bg-green-500 cursor-pointer py-2 px-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
                    onClick={onCancel}
                    disabled={cancelableRewards === 0 || isCancelling}
                  >
                    {isCancelling ? (
                      <PuffLoader
                        size={20}
                        color={theme === "dark" ? "#fff" : "#000"}
                      />
                    ) : (
                      <>{t("cancel")}</>
                    )}
                  </button>
                </div>
              )}

              {/* Claimable Rewards & Button */}
              {claimableRewards > 0 && (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm opacity-70">{t("unclaimed")}</p>
                    <div className="flex items-center gap-1 font-semibold text-green-500">
                      <Image
                        src={coinIcon}
                        alt="Solana"
                        width={20}
                        height={20}
                        className="w-[20px] h-auto object-contain"
                      />
                      <span>{formatNum(claimableRewards)} SOL</span>
                    </div>
                  </div>
                  <button
                    className="glass bg-green-500 cursor-pointer py-2 px-4 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
                    onClick={onClaim}
                    disabled={claimableRewards === 0 || isClaiming}
                  >
                    {isClaiming ? (
                      <PuffLoader
                        size={20}
                        color={theme === "dark" ? "#fff" : "#000"}
                      />
                    ) : (
                      <>{t("claim")}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass rounded-xl p-4 flex justify-center items-center">
            <p className="text-sm opacity-70">{t("connect")}</p>
          </div>
        )}
      </div>
    );
  }
);

MarketHeader.displayName = "MarketHeader";
export default MarketHeader;

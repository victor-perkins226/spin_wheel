"use client";

import { useState, useRef } from "react";
import { ChevronLeft, User, Coins } from "lucide-react";
import coinIcon from "@/public/assets/solana_logo.png";
import medalBronze from "@/public/assets/bronze.png";
import filled from "@/public/assets/filled.png";
import unfilled from "@/public/assets/unfilled.png";
import solCoin from "@/public/assets/sol-blue.png";
import fnCoin from "@/public/assets/fn-blue.png";
import Image from "next/image";
import SVG from "./svg.component";

interface Prize {
  label: string;
  value: string;
  color: string;
}

const prizes: Prize[] = [
  { label: "100 FN", value: "100", color: "from-cyan-400 to-blue-500" },
  { label: "200 FN", value: "200", color: "from-cyan-400 to-blue-500" },
  { label: "0.25 SOL", value: "0.25", color: "from-cyan-400 to-blue-500" },
  { label: "0.5 SOL", value: "0.5", color: "from-cyan-400 to-blue-500" },
  { label: "50 FN", value: "50", color: "from-cyan-400 to-blue-500" },
  { label: "300 FN", value: "300", color: "from-cyan-400 to-blue-500" },
  { label: "0.3 SOL", value: "0.3", color: "from-cyan-400 to-blue-500" },
  { label: "0.5 SOL", value: "0.5", color: "from-cyan-400 to-blue-500" },
];

export default function LuckySpin() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);
  const SPIN_MS = 5000;
  const wheelWrapRef = useRef<HTMLDivElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const spinTimer = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSliceRef = useRef<number>(-1);

  const [chances, setChances] = useState<number>(3);
  // vivid conic background; light/dark friendly
  const wheelGradient = `conic-gradient(from -90deg, ${prizes
    .map((_, i) => {
      const hue = Math.round((i / prizes.length) * 360);
      const start = (i * 100) / prizes.length;
      const end = ((i + 1) * 100) / prizes.length;
      return `hsl(${hue} 70% 50% / 0.25) ${start}% ${end}%`;
    })
    .join(", ")})`;

  const handleSpin = () => {
    if (isSpinning || chances === 0) return;
    setIsSpinning(true);

    const extra = 2000 + Math.floor(Math.random() * 3000); // inertia
    const randomRotation = 360 + Math.floor(Math.random() * 360) + extra;

    // kick the transition on the next frame
    requestAnimationFrame(() => setRotation((prev) => prev + randomRotation));

    // ticker bounce while spinning
    const runTicker = () => {
      if (!wheelRef.current || !tickerRef.current) return;
      const styles = window.getComputedStyle(wheelRef.current);
      const t = styles.transform;
      if (t && t !== "none") {
        const [a, b] = t
          .split("(")[1]
          .split(")")[0]
          .split(",")
          .slice(0, 2)
          .map(parseFloat);
        let rad = Math.atan2(b, a);
        if (rad < 0) rad += 2 * Math.PI;
        const deg = Math.round((rad * 180) / Math.PI);
        const slice = Math.floor(deg / sliceAngle);
        if (lastSliceRef.current !== slice) {
          const el = tickerRef.current;
          el.style.animation = "none";
          void el.offsetHeight; // reflow
          el.style.animation = "tick 700ms cubic-bezier(0.34, 1.56, 0.64, 1)";
          lastSliceRef.current = slice;
        }
      }
      rafRef.current = requestAnimationFrame(runTicker);
    };
    rafRef.current = requestAnimationFrame(runTicker);

    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = window.setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current!);
      setIsSpinning(false);
      setRotation((prev) => prev % 360);
      setChances((prev) => Math.max(0, prev - 1)); // one chance used
    }, SPIN_MS);
  };

  const sliceAngle = 360 / prizes.length;

  const wheelBg = prizes
    .map((_, i) => {
      const start = (i * 100) / prizes.length;
      const end = ((i + 1) * 100) / prizes.length;
      const light =
        i % 2 === 0 ? "rgba(34,211,238,0.20)" : "rgba(59,130,246,0.20)"; // cyan-400 / blue-500
      const dark =
        i % 2 === 0 ? "rgba(34,211,238,0.30)" : "rgba(59,130,246,0.30)";
      return `var(--wheel-color-${i}) ${start}% ${end}%`.replace(
        `var(--wheel-color-${i})`,
        `color-mix(in oklab, ${light} 50%, ${dark} 50%)`
      );
    })
    .join(", ");

  return (
    <div className="w-full  mx-auto glass backdrop-blur-sm rounded-2xl  shadow-2xl border ">
      {/* Header */}
      <div className="flex items-center glass rounded-t-2xl p-3  justify-between mb-6">
        <div className="flex  items-center w-full gap-3">
          <button className="p-2 glass rounded-lg transition-colors">
            <ChevronLeft className="size-6 text-white" />
          </button>
          <h1 className="text-white w-full text-center text-2xl font-semibold">
            Lucky Spin
          </h1>
        </div>
      </div>
      {/* User Level */}
      <div className="flex items-center justify-between px-10 mx-auto mb-12">
        <div className="glass  rounded-xl">
          <div className="flex gap-4 justify-between w-full items-center py-2 px-6">
            <div
              className={`rounded-xl ${
                chances >= 1 ? "shadow-pink-600 shadow-md" : ""
              }`}
            >
              <Image
                src={chances >= 1 ? filled : unfilled}
                width={64}
                height={48}
                alt={chances >= 1 ? "filled" : "unfilled"}
                className="rounded-xl w-full object-cover"
              />
            </div>

            {/* Middle badge */}
            <div
              className={`rounded-xl ${
                chances >= 2 ? "shadow-pink-600 shadow-md" : ""
              }`}
            >
              <Image
                src={chances >= 2 ? filled : unfilled}
                width={64}
                height={48}
                alt={chances >= 2 ? "filled" : "unfilled"}
                className="rounded-xl w-full object-cover"
              />
            </div>

            {/* Right badge */}
            <div
              className={`rounded-xl ${
                chances >= 3 ? "shadow-pink-600 shadow-md" : ""
              }`}
            >
              <Image
                src={chances >= 3 ? filled : unfilled}
                width={64}
                height={48}
                alt={chances >= 3 ? "filled" : "unfilled"}
                className="rounded-xl w-full object-cover"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 px-3 py-1 ">
          <div className=" rounded-full">
            <Image
              width={64}
              height={78}
              src={medalBronze}
              alt="Bronze Medal"
            />
          </div>
          <div className="text-white flex gap-2 flex-col text-sm">
            <div className="glass text-center p-1 rounded-xl">BRONZE</div>
            <div className="text-xs">Level 2 or above</div>
          </div>
        </div>
      </div>

      {/* Spinning Wheel */}
      <div ref={wheelWrapRef} className="relative mb-8">
        <div className="relative w-[22rem] h-[22rem] sm:w-[26rem] sm:h-[26rem] md:w-[30rem] md:h-[30rem] mx-auto">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full p-[10px] bg-gradient-to-tr bg-[#201561]">
            {/* Wheel Core */}
            <div className="relative w-full h-full rounded-full bg-white dark:bg-slate-950 shadow-inner overflow-hidden">
              {/* Rotating face with conic paint */}
              <div
                ref={wheelRef}
                className="absolute inset-0 rounded-full transition-transform will-change-transform"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? `transform ${SPIN_MS}ms cubic-bezier(0.1,-0.01,0,1)`
                    : "none",
                  background: wheelGradient,
                }}
              >
                {/* Labels + icons rotate with the wheel */}
                {prizes.map((prize, index) => {
                  const angle = index * sliceAngle;
                  const isSOL = /sol/i.test(prize.label);
                  return (
                    <div
                      key={index}
                      className="absolute inset-0"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      {/* place at slice centerline */}
                      <div
                        className="absolute left-1/2 top-[5%] -translate-x-1/2"
                        style={{
                          transform: `translateX(-100%) rotate(${
                            sliceAngle / 2
                          }deg)`,
                        }}
                      >
                        {/* counter-rotate so text is straight */}
                        <div
                          className="flex flex-col items-center gap-1 will-change-transform"
                          style={{
                            transform: `rotate(${
                              -rotation - angle - sliceAngle / 2
                            }deg)`,
                          }}
                        >
                          {isSOL ? (
                            <Image
                              src={solCoin}
                              alt="SOL"
                              width={57}
                              height={63}
                            />
                          ) : (
                            <Image
                              src={fnCoin}
                              alt="FN"
                              width={57}
                              height={63}
                            />
                          )}
                          <span className="text-lg font-semibold">
                            {prize.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center Spin Button */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || chances === 0}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr bg-[#201561] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-transform duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed ring-4 ring-white/60 dark:ring-slate-900/70"
                >
                  SPIN
                </button>
              </div>
            </div>
          </div>

          {/* Pointer with tick animation */}
          <div
            ref={tickerRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 origin-top"
          >
            <div className="w-3 h-3 border-l-5 border-r-5 border-b-10 border-l-transparent border-r-transparent border-cyan-300 bg-[#201561]" />
          </div>
        </div>

        {/* wheel-only keyframes */}
        <style jsx>{`
          @keyframes tick {
            40% {
              transform: rotate(-12deg);
            }
          }
        `}</style>
      </div>

      <div className="w-full max-w-sm mx-auto">
        {/* Spin Now Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || chances === 0}
          className="w-full bg-gradient-to-tr  from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mb-6 ring-2 ring-white/50 dark:ring-slate-800/70"
        >
          {isSpinning ? "SPINNING..." : "SPIN NOW"}
        </button>
      </div>

      {/* User Info */}
      <div className="flex items-center max-w-xl my-12 mx-auto justify-between">
        <div className="flex items-center gap-4 glass px-6 py-1 rounded-2xl">
          <Image
            src={coinIcon}
            alt="Solana"
            width={64}
            height={64}
            className="w-[32px] sm:w-[32px] lg:w-[64px] h-auto object-contain "
          />
          <div className="flex flex-col">
            <span className="uppercase text-sm">Spin Bonus Total</span>
            <span className="text-2xl font-semibold">2300 SOL</span>
          </div>
        </div>
        <div className="flex items-center gap-4 glass px-4 py-1 rounded-2xl">
          <SVG width={48} height={48} iconName="avatar" />
          <div className="flex flex-col">
            <span className="text-sm">New Win</span>
            <span className="text-2xl font-semibold">John Doe</span>
          </div>
        </div>
      </div>
    </div>
  );
}

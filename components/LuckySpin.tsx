"use client";

import { useState, useRef } from "react";
import { ChevronLeft, User, Coins } from "lucide-react";
import coinIcon from "@/public/assets/solana_logo.png";
import medalBronze from "@/public/assets/bronze.png";
import filled from "@/public/assets/filled.png";
import unfilled from "@/public/assets/unfilled.png";
import solCoin from "@/public/assets/sol-blue.png";
import fnCoin from "@/public/assets/fn-blue.png";
import dividers from "@/public/assets/Dividers.png";
import Image from "next/image";
import Polygon from "@/public/assets/polygon.png";
import DarkPolygon from "@/public/assets/black_polygon.png";
import GradientBackground from "@/public/assets/ellipse.png";
import SVG from "./svg.component";
import { useTheme } from "next-themes";

interface Prize {
  label: string;
  value: string;
  color: string;
}

const prizes: Prize[] = [
  { label: "100 FN", value: "100", color: "from-cyan-400 to-blue-500" },
  { label: "0.1 SOL", value: "0.1", color: "from-cyan-400 to-blue-500" },
  { label: "200 FN", value: "200", color: "from-cyan-400 to-blue-500" },
  { label: "0.2 SOL", value: "0.2", color: "from-cyan-400 to-blue-500" },
  { label: "0.25 SOL", value: "0.25", color: "from-cyan-400 to-blue-500" },
  { label: "50 FN", value: "50", color: "from-cyan-400 to-blue-500" },
  { label: "300 FN", value: "300", color: "from-cyan-400 to-blue-500" },
  { label: "0.3 SOL", value: "0.3", color: "from-cyan-400 to-blue-500" },
];

export default function LuckySpin() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const { theme } = useTheme();
  const textCls = theme === "light" ? "text-[#1F1F43]" : "text-white";

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
      return `#04082D`;
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
          void el.offsetHeight;
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
      <div className="flex items-center glass rounded-t-2xl p-3  justify-between mb-2">
        <div className="flex  items-center w-full gap-3">
          <button className="p-2 glass rounded-lg transition-colors">
            <ChevronLeft className="size-6 " />
          </button>
          <h1 className=" w-full text-center text-2xl font-semibold">
            Lucky Spin
          </h1>
        </div>
      </div>
      {/* User Level */}
      <div className="flex items-center justify-between max-w-lg mx-auto mb-8">
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
        <div className="flex items-center glass rounded-xl gap-4 px-3 py-1 ">
          <div className=" rounded-full">
            <Image
              width={48}
              height={78}
              src={medalBronze}
              alt="Bronze Medal"
            />
          </div>
          <div className="font-semibold flex gap-2 flex-col text-sm">
            <div className="glass text-center p-1 px-8 rounded-xl">BRONZE</div>
            <div className="text-xs text-center font-medium">
              Level 2 or above
            </div>
          </div>
        </div>
      </div>

      {/* Spinning Wheel */}
      <div ref={wheelWrapRef} className="relative mb-8">
        <div
          className={
            theme === "light"
              ? "rounded-full  h-[28rem] w-[28rem] mx-auto border border-[#ffffff] shadow-[0_4px_24px_-1px_#00000033] backdrop-blur-[40px] bg-white/30 "
              : "rounded-full  h-[28rem] w-[28rem] mx-auto border border-[#0d166e] shadow-[0_4px_24px_-1px_#00000033] backdrop-blur-[40px] bg-[#04082D] "
          }
        >
          <div className="relative w-[22rem] h-[22rem] sm:w-[26rem] mt-4 sm:h-[26rem]  mx-auto">
            {/* Outer Ring */}
            {/* <div className="absolute inset-0 rounded-full p-[10px] bg-gradient-to-tr bg-[#201561]"> */}
            {/* <div className=" z-10 h-[30rem] inset-0 rounded-full absolute -top-2 left-11 rotate-[36deg] w-[30rem]">
              <Image
                src={dividers}
                alt="wheel-bg"
                fill
                className="absolute inset-0 rounded-full"
              />
            </div> */}
            {/* Wheel Core */}
            <div className="relative w-full h-full rounded-full bg-whiteshadow-inner overflow-hidden">
              {/* Rotating face with conic paint */}

              <div>
                <Image
                  src={GradientBackground}
                  alt="gradient background"
                  fill
                  className="absolute z-20 inset-0 rounded-full"
                />
              </div>

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
                {/* Rotating dividers image (optional) */}
                <div className="absolute inset-2 pointer-events-none select-none">
                  <Image
                    src={dividers}
                    alt="dividers"
                    fill
                    className="rounded-full"
                  />
                </div>

                {/* Outer ring + radial lines, perfectly aligned */}
                <svg
                  className="absolute inset-0"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid meet"
                  style={{ pointerEvents: "none" }}
                >
                  <defs>
                    <linearGradient
                      id="segStroke"
                      gradientUnits="objectBoundingBox"
                      gradientTransform="rotate(257.57)"
                    >
                      <stop offset="6.16%" stopColor="#5E35D7" />
                      <stop offset="49.87%" stopColor="#2485D1" />
                      <stop offset="82.45%" stopColor="#143FCA" />
                    </linearGradient>
                  </defs>

                  {/* ring sits inside the clip: r = 50 - stroke/2 */}
                  {/* <circle
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="url(#segStroke)"
                  strokeWidth="6"
                  vectorEffect="non-scaling-stroke"
                /> */}

                  {/* dividers at each slice boundary */}
                  <g
                    stroke="url(#segStroke)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  >
                    {Array.from({ length: prizes.length }).map((_, i) => (
                      <line
                        key={i}
                        x1="50"
                        y1="50"
                        x2="50"
                        y2="3" /* ends at ring centerline */
                        transform={`rotate(${i * (360 / prizes.length)} 50 50)`}
                      />
                    ))}
                  </g>
                </svg>
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
                          transform: `translateX(-10%) rotate(${
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
                              width={42}
                              height={48}
                            />
                          ) : (
                            <Image
                              src={fnCoin}
                              alt="FN"
                              width={42}
                              height={48}
                            />
                          )}
                          <span
                            className={`text-[#00EEFE] text-lg  font-semibold`}
                          >
                            {prize.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Gradient separators + outer ring */}
                <svg
                  className="absolute inset-0"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ pointerEvents: "none" }}
                >
                  <defs>
                    <linearGradient
                      id="segStroke"
                      gradientUnits="objectBoundingBox"
                      gradientTransform="rotate(257.57)"
                    >
                      <stop offset="6.16%" stopColor="#5E35D7" />
                      <stop offset="49.87%" stopColor="#2485D1" />
                      <stop offset="82.45%" stopColor="#143FCA" />
                    </linearGradient>
                  </defs>

                  {/* outer circular ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="49"
                    fill="none"
                    stroke="url(#segStroke)"
                    strokeWidth="6"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* radial dividers for each slice */}
                  <g
                    stroke="url(#segStroke)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  >
                    {Array.from({ length: prizes.length }).map((_, i) => (
                      <line
                        key={i}
                        x1="50"
                        y1="50"
                        x2="50"
                        y2="3" // reaches toward the ring; adjust if needed
                        transform={`rotate(${i * (360 / prizes.length)} 50 50)`}
                      />
                    ))}
                  </g>
                </svg>
              </div>

              {/* Center Spin Button */}
              <div
                className={`border-[6px] absolute top-1/2 left-1/2 -translate-x-1/2 rounded-full -translate-y-1/2  w-[190px] z-10 h-[190px] p-4 ${
                  theme === "light"
                    ? "border-white bg-white/30"
                    : "border-[#0e1875] "
                } `}
              >
                <div className="absolute  z-10">
                  <button
                    onClick={handleSpin}
                    disabled={isSpinning || chances === 0}
                    className={`w-36 h-36 left-[2px] top-[1px] absolute  rounded-full bg-gradient-to-tr  font-semibold text-4xl shadow-lg hover:shadow-xl transition-transform duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed ${
                      theme === "dark"
                        ? "ring-4 ring-[#0A9ADD] bg-[#201561]"
                        : "ring-0 ring-white"
                    }`}
                  >
                    {theme !== "light" ? (
                      <span className="text-[var(--Blue-2,#0A9ADD)] inline-block will-change-transform [animation:zoomInOut_1.2s_ease-in-out_infinite] [text-shadow:0_0_0.5px_var(--Blue-2,#0A9ADD),0_0_0.99px_var(--Blue-2,#0A9ADD),0_0_3.47px_var(--Blue-2,#0A9ADD),0_0_6.95px_var(--Blue-2,#0A9ADD)]">
                        SPIN
                      </span>
                    ) : (
                      <span className="text-white animate-bounce">SPIN</span>
                    )}
                  </button>
                
                </div>
              </div>
            </div>
            {/* </div> */}

            {/* Pointer with tick animation */}
            <div
              ref={tickerRef}
              className="absolute top-[-2rem] left-1/2 -translate-x-1/2 -translate-y-2 z-20 origin-top"
            >
              <Image
                src={theme === "dark" ? DarkPolygon : Polygon}
                alt="pointer"
                width={48}
                height={48}
                className="w-12 h-12 sm:w-16 sm:h-16"
              />
            </div>
          </div>

          {/* wheel-only keyframes */}
          <style jsx>{`
          
  @keyframes zoomInOut {
    0%   { transform: scale(0.95); }
    50%  { transform: scale(1.15); }
    100% { transform: scale(0.95); }
  }
            @keyframes tick {
              40% {
                transform: rotate(-12deg);
              }
            }
          `}</style>
        </div>
      </div>
      <div className="w-full max-w-sm mt-[-4rem] mx-auto">
        {/* Spin Now Button */}

        {theme === "light" ? (
          <button
            onClick={handleSpin}
            disabled={isSpinning || chances === 0}
            className="cursor-pointer shadow-[0_4px_24px_-1px_#00000033] backdrop-blur-[40px] bg-white font-bold py-4 px-6 rounded-xl transition-all w-full"
          >
            <span className="uppercase text-3xl  bg-[linear-gradient(257.57deg,_#5E35D7_6.16%,_#2485D1_49.87%,_#061C62_82.45%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
              {isSpinning ? "SPINNING..." : "SPIN NOW"}
            </span>
          </button>
        ) : (
          <button
            onClick={handleSpin}
            disabled={isSpinning || chances === 0}
            className="cursor-pointer shadow-[0_4px_24px_-1px_#00000033] backdrop-blur-[40px] font-bold py-4 px-6 rounded-4xl transition-all w-full  border-[5px] border-transparent
[background:linear-gradient(#04082D,#04082D)_padding-box,linear-gradient(257.57deg,_#3161E6_6.16%,_#37ABE8_28.43%,_#4169F7_49.87%,_#365EE5_82.45%)_border-box]
[background-clip:padding-box,border-box]"
          >
            <span className="uppercase text-3xl bg-[linear-gradient(257.57deg,_#3161E6_6.16%,_#37ABE8_28.43%,_#4169F7_49.87%,_#365EE5_82.45%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
              {isSpinning ? "SPINNING..." : "SPIN NOW"}
            </span>
          </button>
        )}
      </div>

      {/* User Info */}
      <div className="flex glass p-2 rounded-3xl shadow-0 items-center max-w-lg mb-5 mt-10 mx-auto justify-between">
        <div className="flex  items-center gap-4 glass px-6 py-2 rounded-2xl">
          <Image
            src={coinIcon}
            alt="Solana"
            width={48}
            height={48}
            className="w-[48px] h-auto object-contain "
          />
          <div className="flex flex-col">
            <span className="uppercase text-sm">Spin Bonus Total</span>
            <span className={`text-2xl font-semibold ${textCls}`}>
              2300 SOL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 glass px-4 py-2 rounded-2xl">
          <SVG width={48} height={48} iconName="avatar" />
          <div className="flex flex-col items-start">
            <span className="text-sm">New Win</span>
            <span className={`text-2xl font-semibold ${textCls}`}>
              John Doe
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

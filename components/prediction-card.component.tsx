import React, { useState } from "react";
import Button from "./button.component";
import SVG from "./svg.component";
import Image from "next/image";
import SolanaBg from "@/public/assets/solana_bg.png";
import SolanaLogo from "@/public/assets/solana_logo.png";
import SliderComponent from "./slider.component";

interface IProps {
  variant?: "live" | "expired" | "next" | "later";
}

const CUSTOM_INPUTS = [
  { label: "10%" },
  { label: "25%" },
  { label: "50%" },
  { label: "75%" },
  { label: "Max" },
];

export default function PredictionCard({ variant }: IProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<"up" | "down" | "">("");
  const [amount, setAmount] = useState<number | undefined>();

  console.log(mode);

  const handleEnterPrediction = (mode: "up" | "down") => {
    setIsFlipped(true);
    setMode(mode);
  };

  return (
    // In PredictionCard.jsx, update the card_container class
    <div
      className={`card_container glass rounded-[20px] p-[15px] sm:p-[25px] ${variant === "live" ? "min-w-[280px] sm:min-w-[320px] md:min-w-[380px]" : "min-w-[240px] sm:min-w-[273px] w-full"
        }`}
    >
      <div
        className={`${isFlipped ? "hidden" : "flex"
          } flex-col justify-between gap-[10px]`}
      >
        <div
          className={`${variant === "expired" ? "opacity-50" : ""
            } flex justify-between font-semibold text-[20px]`}
        >
          <div className="flex items-center gap-[10px]">
            <SVG width={12} height={12} iconName="play-fill" />
            <p className="capitalize">{variant ?? "Expired"}</p>
          </div>

          <p>#366520</p>
        </div>

        <Button
          style={{
            background:
              variant === "expired"
                ? "linear-gradient(90deg, #06C729 0%, #04801B 100%)"
                : "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)",
          }}
          className="glass flex flex-col gap-4 py-[16px]"
        >
          <p className="text-[20px] font-[600] leading-0">UP</p>
          <p className="text-[10px] font-[600] leading-0">2.51x payout</p>
        </Button>

        {variant === "later" ? (
          <div className="glass flex-1 rounded-[20px] flex flex-col gap-[12px] items-center justify-center">
            <div className="flex items-center gap-[12px]">
              <SVG iconName="play-fill" />
              <p className="font-semibold text-[20px]">Next Play</p>
            </div>

            <p className="font-semibold text-[35px]">5:00</p>
          </div>
        ) : variant === "next" ? (
          <div className="flex-1 glass flex flex-col justify-between gap-[13px] rounded-[20px] px-[19px] py-[8.5px]">
            <div className="flex flex-col gap-[7px]">
              <Image
                alt=""
                src={SolanaBg}
                className="rounded-[10px] w-[215px] h-[142px] object-cover"
              />

              <div className="flex justify-between font-semibold text-[16px]">
                <p>Prize Pool</p>

                <p>0.1 SOL</p>
              </div>
            </div>

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
          </div>
        ) : (
          <div className="flex-1 flex flex-col glass p-[10px] rounded-[20px] items-center">
            <div className="max-w-[215px] flex flex-col gap-[33px] justify-between flex-1">
              <Image
                alt=""
                src={SolanaBg}
                className="rounded-[10px] w-[215px] h-[142px] object-cover"
              />

              <div className="flex flex-col gap-[22px] font-semibold text-[#FEFEFE]">
                <div className="flex justify-between">
                  <p className="text-[20px]">$585.1229</p>

                  <div className="bg-white flex items-center gap-[4px] text-[#1F1F43] px-[10px] py-[5px] rounded-[5px]">
                    <SVG width={8} height={8} iconName="arrow-up" />
                    <p className="text-[10px]">$0.0001</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <p>Locked Price</p>

                  <p>$584.1229</p>
                </div>

                <div className="flex justify-between text-[16px]">
                  <p>Prize Pool</p>

                  <p>8.6015 BNB</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Button
          style={{
            background:
              variant === "live"
                ? "linear-gradient(90deg, #FD6152 0%, #AE1C0F 100%)"
                : "linear-gradient(228.15deg, rgba(255, 255, 255, 0.2) -64.71%, rgba(255, 255, 255, 0.05) 102.6%)",
          }}
          className="glass flex flex-col gap-4 py-[16px]"
        >
          <p className="text-[20px] font-[600] leading-0">DOWN</p>
          <p className="text-[10px] font-[600] leading-0">2.51x payout</p>
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
              src={SolanaLogo}
              alt=""
            />
            <p className="font-semibold text-[15px]">SOL</p>
          </div>
        </div>

        <input
          type="number"
          max={10}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="glass h-[65px] text-right rounded-[20px] pr-4 font-semibold text-[16px] text-white outline-0"
          placeholder="Enter Value:"
        />

        <SliderComponent
          value={amount ? [amount] : [0]}
          onValueChange={(e) => setAmount(e[0])}
          max={10}
          step={0.1}
        />

        <div className="flex gap-y-[12px] gap-x-[4px] justify-between flex-wrap">
          {" "}
          {CUSTOM_INPUTS.map((el, key) => (
            <div
              className="glass  py-[6px] px-[9px] rounded-[20px] font-semibold text-[10px]"
              key={key}
            >
              {el.label}
            </div>
          ))}
        </div>

        <Button>Buy</Button>
      </div>
    </div>
  );
}

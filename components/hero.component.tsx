import Image from "next/image";
import React from "react";
import HeroBg from "@/public/assets/hero_bg.png";

export default function Hero() {
  return (
    <div className="container">
      <section className="rounded-[20px] mt-[17px] lg:mt-[66px] p-[18px] xl:p-[43px] h-[219px] md:h-[494px] w-full glass">
        <div className="relative w-full h-full flex items-center p-[34px] rounded-[20px] overflow-hidden">
          <Image
            src={HeroBg}
            alt=""
            className="absolute w-full h-full top-0 left-0 object-cover"
          />

          {/* <div className="relative flex flex-col items-start max-w-[413px] gap-[40px]">
            <h3 className="font-semibold text-[50px] leading-[124%]">
              Predict and win a fortune
            </h3>

            <Button>Get Started</Button>
          </div> */}
        </div>
      </section>
    </div>
  );
}

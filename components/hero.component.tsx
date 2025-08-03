// components/Hero.tsx
import React from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

import Hero1 from "@/public/assets/Banner1.png";
import Hero2 from "@/public/assets/Banner2.png";
import Hero3 from "@/public/assets/Banner3.png";
import Hero4 from "@/public/assets/Banner4.png";
import { useTheme } from "next-themes";

const slides = [Hero1, Hero2, Hero3, Hero4];

export default function Hero() {
  const { theme } = useTheme();

  return (
    <div className="container bg-background">
      <section className="rounded-[20px] mt-[17px] lg:mt-[66px] p-[8px] xl:p-[33px] h-[170px] md:h-[494px] w-full glass overflow-hidden">
        <Swiper
          modules={[Autoplay, Pagination]}
          pagination={{ clickable: true }}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
          spaceBetween={20}
          className="w-full h-full"
        >
          {slides.map((src, idx) => (
            <SwiperSlide key={idx} className="relative w-full h-full">
              <Image
                src={src}
                alt={`Slide ${idx + 1}`}
                fill
                className={`
                  object-cover
                  rounded-2xl
                  object-left
                  border-4
                  ${theme === "dark" ? "border-gray-200/90" : "border-black/50"}
                  transition-all              
                `}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>
    </div>
  );
}

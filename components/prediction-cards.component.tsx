"use client";

import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useTheme } from "next-themes";
import SVG from "./svg.component";
import PredictionCard from "./prediction-card.component";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

// LineChart component from the first file
const LineChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Determine if we're in dark mode
  const isDarkMode = mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  // Set mounted to true on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!chartRef.current || !mounted) return;

    // Destroy existing chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Time labels from 10:59PM to 7:59AM
    const labels = [
      "10:59PM",
      "11:59PM",
      "12:59AM",
      "1:59AM",
      "2:59AM",
      "3:59AM",
      "4:59AM",
      "5:59AM",
      "6:59AM",
      "7:59AM",
    ];

    // Data points that match the curve in the image
    const dataPoints = [2950, 3100, 3500, 3700, 3500, 3950, 3650, 4350, 4600, 4350, 4900, 4700, 5200, 5100, 5300, 5400];
    
    // Second line data - starts lower, overlaps in the middle, then goes higher
    const secondLineData = [2500, 2700, 3000, 3300, 3400, 3600, 3800, 4200, 4600, 4800, 5000, 5300, 5500, 5700, 5800, 6000];

    // Theme-based colors
    const lineColor = isDarkMode ? "#a1a1aa" : "#d8d8d8";
    const secondLineColor = isDarkMode ? "#6366f1" : "#4f46e5"; // Purple color for second line
    const textColor = isDarkMode ? "#a1a1aa" : "#6f6c99";
    const gridColor = isDarkMode ? "#27272a" : "#e2e2e8";
    const tooltipBgColor = isDarkMode ? "#27272a" : "#ffffff";
    const tooltipTextColor = isDarkMode ? "#e4e4e7" : "#6f6c99";
    const tooltipBorderColor = isDarkMode ? "#3f3f46" : "#e2e2e8";

    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Oracle",
            data: dataPoints,
            borderColor: lineColor,
            backgroundColor: "transparent",
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 0,
          },
          {
            label: "TradingView",
            data: secondLineData,
            borderColor: secondLineColor,
            backgroundColor: "transparent",
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 0,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: tooltipBgColor,
            titleColor: tooltipTextColor,
            bodyColor: tooltipTextColor,
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y}`,
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: 12,
              },
            },
          },
          y: {
            min: 2000,
            max: 6500,
            ticks: {
              stepSize: 500,
              color: textColor,
              font: {
                size: 12,
              },
            },
            grid: {
              color: gridColor,
              borderDash: [5, 5],
            },
            border: {
              display: false,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
        elements: {
          line: {
            cubicInterpolationMode: "monotone",
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [isDarkMode, mounted]);

  if (!mounted) {
    return <div className="w-full h-[300px] bg-background"></div>;
  }

  return (
    <div className="w-full h-[300px] glass rounded-lg p-4">
      <canvas ref={chartRef} />
    </div>
  );
};

export default function PredictionCards() {
  const formatCardVariant = (index: number) => {
    switch (index) {
      case 1:
        return "expired";
      case 2:
        return "live";
      default:
        return "next";
    }
  };

  return (
    <div className="container mt-[40px] flex flex-col gap-[40px]">
      <div className="grid grid-cols-12 xl:gap-[40px]">
        <div className="flex flex-col gap-[53px] col-span-12 xl:col-span-9">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="relative">
              <Image
                className="w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                src={SolanaLogo}
                alt=""
              />
              <div className="glass flex gap-[9px] lg:gap-[26px] relative top-0 left-[10px] lg:left-[20px] items-center font-semibold px-[20px] lg:px-[44px] py-[6px] lg:py-[15px] rounded-[50px]">
                <p className="text-[12px] lg:text-[20px]">SOL/USDT</p>
                <p className="text-[12px]">$534.1229</p>
              </div>
            </div>

            <div className="glass py-[6px] lg:py-[15px] px-[24px] rounded-[40px] w-[104px] lg:w-[210px] relative">
              <p className="flex items-center font-semibold text-[12px] lg:text-[20px] gap-[7px]">
                4:02 <span className="text-[8px] lg:text-[12px]">5m</span>
              </p>
              <div className="hidden w-[64px] h-[64px] glass absolute rounded-full right-[24px] top-[-2px] lg:flex items-center justify-center backdrop-blur-2xl">
                <SVG width={40} height={40} iconName="clock" />
              </div>
              <div className="lg:hidden w-[33px] h-[33px] glass absolute rounded-full right-[0px] top-[-2px] flex items-center justify-center backdrop-blur-2xl">
                <SVG width={18} height={18} iconName="clock" />
              </div>
            </div>
          </div>

          {/* Swiper Slider */}
          <Swiper
            effect="coverflow"
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={2}
            coverflowEffect={{
              rotate: 50,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            }}
            pagination={{ clickable: true }}
            modules={[EffectCoverflow, Pagination]}
            breakpoints={{
              768: {
                slidesPerView: 1,
              },
              1024: {
                slidesPerView: 3,
              },
            }}
            className="w-full"
          >
            {[1, 2, 3].map((card, key) => (
              <SwiperSlide key={key} className="flex justify-center">
                <PredictionCard variant={formatCardVariant(card)} />
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Added Line Chart Component */}
          <LineChart />
        </div>

        {/* Live Bets Sidebar */}
        <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
          <div className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px]">
            Live Bets
          </div>
          <div className="glass px-[30px] py-[16px] rounded-[20px] w-full">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="pb-[24px]">User</th>
                  <th className="pb-[24px]">Amount</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(20)].map((_, key) => (
                  <tr key={key} className="font-semibold text-[15px]">
                    <td className="py-3">
                      <div className="flex gap-[6px] items-center">
                        <SVG width={29} height={29} iconName="avatar" />
                        John Doe
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Image
                          className="w-[30px] h-auto object-contain"
                          src={SolanaLogo}
                          alt=""
                        />
                        0.1 SOL
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

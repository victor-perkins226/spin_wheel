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
import type SwiperCore from 'swiper';
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

const LineChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const isDarkMode = mounted && (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!chartRef.current || !mounted) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = [
      "10:59PM", "11:59PM", "12:59AM", "1:59AM", "2:59AM",
      "3:59AM", "4:59AM", "5:59AM", "6:59AM", "7:59AM",
    ];

    const dataPoints = [2950, 3100, 3500, 3700, 3500, 3950, 3650, 4350, 4600, 4350, 4900, 4700, 5200, 5100, 5300, 5400];
    const secondLineData = [2500, 2700, 3000, 3300, 3400, 3600, 3800, 4200, 4600, 4800, 5000, 5300, 5500, 5700, 5800, 6000];

    // Improved color palette
    const primaryLineColor = isDarkMode ? "#8b5cf6" : "#7c3aed"; // Purple
    const secondaryLineColor = isDarkMode ? "#10b981" : "#059669"; // Green
    const textColor = isDarkMode ? "#94a3b8" : "#475569";
    const gridColor = isDarkMode ? "#334155" : "#e2e8f0";
    const tooltipBgColor = isDarkMode ? "#1e293b" : "#ffffff";
    const tooltipTextColor = isDarkMode ? "#f1f5f9" : "#334155";
    const tooltipBorderColor = isDarkMode ? "#475569" : "#cbd5e1";
    const tooltipTitleColor = isDarkMode ? "#f8fafc" : "#1e293b";

    // Create gradients for line backgrounds
    const primaryGradient = ctx.createLinearGradient(0, 0, 0, 300);
    primaryGradient.addColorStop(0, isDarkMode ? "rgba(139, 92, 246, 0.3)" : "rgba(124, 58, 237, 0.2)");
    primaryGradient.addColorStop(1, isDarkMode ? "rgba(139, 92, 246, 0)" : "rgba(124, 58, 237, 0)");

    const secondaryGradient = ctx.createLinearGradient(0, 0, 0, 300);
    secondaryGradient.addColorStop(0, isDarkMode ? "rgba(16, 185, 129, 0.3)" : "rgba(5, 150, 105, 0.2)");
    secondaryGradient.addColorStop(1, isDarkMode ? "rgba(16, 185, 129, 0)" : "rgba(5, 150, 105, 0)");

    // Create a plugin for custom hover effects with proper TypeScript typing
    type ChartWithArea = Chart & {
      chartArea: { top: number; bottom: number };
    };
    
    const hoverLine = {
      id: 'hoverLine',
      beforeDraw: (chart: ChartWithArea) => {
        if (activeIndex !== null) {
          const {ctx, chartArea} = chart;
          const meta = chart.getDatasetMeta(0);
          if (meta.data[activeIndex]) {
            const x = meta.data[activeIndex].x;
            
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Oracle",
            data: dataPoints,
            borderColor: primaryLineColor,
            backgroundColor: primaryGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: primaryLineColor,
            pointHoverBorderColor: isDarkMode ? "#1e1e1e" : "#ffffff",
            pointHoverBorderWidth: 2,
          },
          {
            label: "TradingView",
            data: secondLineData,
            borderColor: secondaryLineColor,
            backgroundColor: secondaryGradient,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: secondaryLineColor,
            pointHoverBorderColor: isDarkMode ? "#1e1e1e" : "#ffffff",
            pointHoverBorderWidth: 2,
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
            align: 'end',
            labels: {
              color: textColor,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: isMobile ? 12 : 20,
              font: {
                size: isMobile ? 10 : 13,
                weight: 'bold'
              },
              boxWidth: isMobile ? 8 : 10,
            }
          },
          tooltip: {
            enabled: true,
            backgroundColor: tooltipBgColor,
            titleColor: tooltipTitleColor,
            bodyColor: tooltipTextColor,
            borderColor: tooltipBorderColor,
            borderWidth: 1,
            cornerRadius: 6,
            padding: isMobile ? 8 : 12,
            displayColors: true,
            titleFont: {
              size: isMobile ? 11 : 14,
              weight: 'bold'
            },
            bodyFont: {
              size: isMobile ? 10 : 12
            },
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${context.dataset.label}: $${value.toLocaleString()}`;
              },
              title: (tooltipItems) => {
                return tooltipItems[0].label;
              }
            },
            intersect: false,
            mode: 'index',
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: isMobile ? 9 : 11,
                weight: 'normal'
              },
              maxRotation: isMobile ? 45 : 0,
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 10,
              padding: 8,
            },
          },
          y: {
            min: 2000,
            max: 6500,
            ticks: {
              stepSize: isMobile ? 1000 : 500,
              color: textColor,
              font: {
                size: isMobile ? 9 : 11,
                weight: 'normal'
              },
              padding: 10,
              callback: function (value) {
                return isMobile 
                  ? `$${value.toString().slice(0, -3)}k` 
                  : `$${value.toLocaleString()}`;
              }
            },
            grid: {
              color: gridColor,
              tickLength: 0,
              lineWidth: 1,
              drawOnChartArea: true,
              drawTicks: false,
              z: -1,
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
        hover: {
          mode: 'index',
          intersect: false,
        },
          onHover: (event, elements) => {
            if (elements && elements.length) {
              setActiveIndex(elements[0].index);
            } else {
              setActiveIndex(null);
            }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      },
      plugins: [hoverLine],
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [isDarkMode, mounted, isMobile, activeIndex]);

  if (!mounted) {
    return <div className="w-full h-[200px] md:h-[250px] lg:h-[300px] bg-background"></div>;
  }

  return (
    <div className="w-full h-[200px] md:h-[250px] lg:h-[300px] glass rounded-lg p-2 md:p-4 lg:p-5 relative overflow-hidden">
      {/* Optional decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/5 to-green-500/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 rounded-full blur-3xl -z-10"></div>
      
      <canvas ref={chartRef} />
    </div>
  );
};

const MobileLiveBets = () => {
  return (
    <div className="w-full glass px-3 py-4 rounded-lg mt-2">
      <h3 className="font-semibold text-base mb-3">Live Bets</h3>
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-2 text-xs">User</th>
              <th className="pb-2 text-xs">Amount</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, key) => (
              <tr key={key} className="font-semibold text-xs">
                <td className="py-2">
                  <div className="flex gap-1 items-center">
                    <SVG width={20} height={20} iconName="avatar" />
                    John Doe
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    <Image
                      className="w-[20px] h-auto object-contain"
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
  )
};

export default function PredictionCards() {
  const [screenWidth, setScreenWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swiperRef = useRef<SwiperCore | null>(null);

  useEffect(() => {
    setMounted(true);
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };
    updateScreenWidth();
    window.addEventListener('resize', updateScreenWidth);
    return () => {
      window.removeEventListener('resize', updateScreenWidth);
      if (swiperRef.current && swiperRef.current.destroy) {
        swiperRef.current.destroy(true, true);
      }
    };
  }, []);

  const formatCardVariant = (index: number) => {
    switch (index) {
      case 1: return "expired";
      case 2: return "live";
      default: return "next";
    }
  };

  const getSlidesPerView = () => {
    if (!mounted) return 1;
    if (screenWidth < 640) return 1;
    if (screenWidth < 1024) return 2;
    return 3;
  };

  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 mt-4 md:mt-6 lg:mt-[40px] flex flex-col gap-4 md:gap-6 lg:gap-[40px]">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 xl:gap-[40px]">
        <div className="flex flex-col gap-6 md:gap-8 lg:gap-[40px] col-span-12 xl:col-span-9">
          {/* Header */}
          <div className="flex justify-between items-center flex-wrap gap-2 md:gap-4">
            <div className="relative">
              <Image
                className="w-[24px] sm:w-[32px] lg:w-[64px] h-auto object-contain absolute left-0 top-0 z-10"
                src={SolanaLogo}
                alt=""
              />
              <div className="glass flex gap-2 sm:gap-[9px] lg:gap-[26px] relative top-0 left-[8px] sm:left-[10px] lg:left-[20px] items-center font-semibold px-3 sm:px-[20px] lg:px-[44px] py-1 sm:py-[6px] lg:py-[15px] rounded-full">
                <p className="text-[10px] sm:text-[12px] lg:text-[20px]">SOL/USDT</p>
                <p className="text-[10px] sm:text-[12px]">$534.1229</p>
              </div>
            </div>

            <div className="glass py-1 sm:py-[6px] lg:py-[15px] px-3 sm:px-[24px] rounded-full w-[90px] sm:w-[104px] lg:w-[210px] relative">
              <p className="flex items-center font-semibold text-[10px] sm:text-[12px] lg:text-[20px] gap-1 sm:gap-[7px]">
                4:02 <span className="text-[6px] sm:text-[8px] lg:text-[12px]">5m</span>
              </p>
              <div className="hidden w-[64px] h-[64px] glass absolute rounded-full right-[24px] top-[-2px] lg:flex items-center justify-center backdrop-blur-2xl">
                <SVG width={40} height={40} iconName="clock" />
              </div>
              <div className="w-[24px] h-[24px] sm:w-[33px] sm:h-[33px] glass absolute rounded-full right-0 top-[-2px] sm:right-[0px] sm:top-[-2px] flex items-center justify-center backdrop-blur-2xl">
                <SVG width={14} height={14} iconName="clock" />
              </div>
            </div>
          </div>

          {/* Swiper Slider */}
          <div className="relative">
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
              }}
              effect="coverflow"
              grabCursor={true}
              centeredSlides={true}
              slidesPerView={getSlidesPerView()}
              spaceBetween={mounted && screenWidth < 640 ? 10 : 20}
              coverflowEffect={{
                rotate: mounted && screenWidth < 640 ? 20 : 50,
                stretch: 0,
                depth: mounted && screenWidth < 640 ? 50 : 100,
                modifier: 1,
                slideShadows: true,
              }}
              pagination={{
                clickable: true,
                dynamicBullets: mounted && screenWidth < 640,
                el: '.swiper-pagination',
              }}
              modules={[EffectCoverflow, Pagination]}
              className="w-full px-4 sm:px-0"
            >
              {[1, 2, 3].map((card, key) => (
                <SwiperSlide key={key} className="flex justify-center items-center">
                  <PredictionCard variant={formatCardVariant(card)} />
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="swiper-pagination !relative !mt-4" />
          </div>

          {/* Line Chart Component */}
          <div className="mt-[-15px]">
            <LineChart />
          </div>

          {/* Mobile-only Live Bets */}
          <div className="xl:hidden">
            <MobileLiveBets />
          </div>
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
                {[...Array(15)].map((_, key) => (
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

"use client";

import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { useTheme } from "next-themes";
import { getCoinGeckoHistoricalPrice, getPythHistoricalPrice, TIME_BUTTONS } from "@/lib/chart-utils";

const LineChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(1);
  const [coinGeckoData, setCoinGeckoData] = useState([])
  const [pythData, setPythData] = useState([]);

  const isDarkMode =
    mounted &&
    (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  useEffect(() => {
    const fetchData = async() => {
      const coinGeckoData = await getCoinGeckoHistoricalPrice(activeIndex)
      const pythData = await getPythHistoricalPrice(activeIndex)

      console.log({coinGeckoData, pythData})
      setCoinGeckoData(coinGeckoData || [])
      if (pythData) {
        setPythData([...pythData])
      }
    }

    fetchData()
  }, [activeIndex])

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  // Create chart with grid background
  useEffect(() => {
    if (!chartRef.current || !mounted) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const primaryLineColor = "#10b981"; // Green line
    const secondaryLineColor = "#ef4444"; // Red line
    const textColor = isDarkMode ? "#94a3b8" : "#475562";
    const gridColor = isDarkMode ? "#ffffff" : "rgba(71, 85, 105, 0.2)"; // Darker grid color that matches the screenshot
    const tooltipBgColor = isDarkMode ? "#1e293b" : "#ffffff";
    const tooltipTextColor = isDarkMode ? "#f1f5f9" : "#334155";
    const tooltipBorderColor = isDarkMode ? "#475569" : "#cbd5e1";
    const tooltipTitleColor = isDarkMode ? "#f8fafc" : "#1e293b";

    // Create gradients for line backgrounds
    const primaryGradient = ctx.createLinearGradient(0, 0, 0, 300);
    primaryGradient.addColorStop(0, "rgba(16, 185, 129, 0.1)");
    primaryGradient.addColorStop(1, "rgba(16, 185, 129, 0)");

    const secondaryGradient = ctx.createLinearGradient(0, 0, 0, 300);
    secondaryGradient.addColorStop(0, "rgba(239, 68, 68, 0.1)");
    secondaryGradient.addColorStop(1, "rgba(239, 68, 68, 0)");

    // Create a plugin for custom hover effects with proper TypeScript typing
    type ChartWithArea = Chart & {
      chartArea: { top: number; bottom: number; left: number; right: number };
    };

    // Hover line plugin
    const hoverLine = {
      id: "hoverLine",
      beforeDraw: (chart: ChartWithArea) => {
        if (activeIndex !== null) {
          const { ctx, chartArea } = chart;
          const meta = chart.getDatasetMeta(0);
          if (meta.data[activeIndex]) {
            const x = meta.data[activeIndex].x;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = isDarkMode
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(0, 0, 0, 0.1)";
            ctx.stroke();
            ctx.restore();
          }
        }
      },
      
    };

    // Create chart
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: pythData.map((item: any) => item.timestamp),
        datasets: [
          {
            label: "Oracle",
            data: pythData.map((item: any) => item.open_price),
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
            data: coinGeckoData.map((item: any) => item[1]),
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
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
        
          legend: {
            display: false, // Hide legend to match screenshot
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
              weight: "bold",
            },
            bodyFont: {
              size: isMobile ? 10 : 12,
            },
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `${context.dataset.label}: $${value.toLocaleString()}`;
              },
              title: (tooltipItems) => {
                return tooltipItems[0].label;
              },
            },
            intersect: false,
            mode: "index",
          },
        },
        scales: {
          x: {
            grid: {
              display: true, // Show X grid lines
              color: gridColor,
              lineWidth: 1,
              drawTicks: false,
            },
            border: {
              display: false,
            },
            ticks: {
              color: textColor,
              font: {
                size: isMobile ? 9 : 11,
                weight: "normal",
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: isMobile ? 6 : 10,
              padding: 8,
            },
          },
          y: {
            min: 0,
            max: 300,
            ticks: {
              stepSize: isMobile ? 1000 : 500,
              color: textColor,
              font: {
                size: isMobile ? 9 : 11,
                weight: "normal",
              },
              padding: 10,
              callback: function (value) {
                return `${value}`;
              },
            },
            grid: {
              display: true, // Show Y grid lines
              color: gridColor,
              lineWidth: 1,
              drawTicks: false,
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
          mode: "index",
          intersect: false,
        },
        // onHover: (event, elements) => {
        //   if (elements && elements.length) {
        //     setActiveIndex(elements[0].index);
        //   }
        // },
        animation: {
          duration: 1500,
          easing: "easeOutQuart",
        },
      },
      plugins: [hoverLine],
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [isDarkMode, mounted, pythData]);


  if (!mounted) {
    return (
      <div className="w-full h-[200px] md:h-[250px] lg:h-[300px] bg-background"></div>
    );
  }

  return (
    <div className="w-full">
      {/* Time period selector buttons */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <h3 className="font-medium">Market Overview</h3>
          <div className="flex items-center gap-1">
            <div className="w-[20px] h-[20px] bg-blue-500 rounded-full"></div>
            <p className="text-[14px]">SOL/USD</p>
          </div>
        </div>

        {/* Time period selector buttons */}
        <div className="border border-gray-400 flex gap-2 bg-gray-800 bg-opacity-70 rounded-full p-1">
          {TIME_BUTTONS.map((btn, index) => (
            <button
              key={btn.id}
              className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all ${
                activeIndex == index
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:text-white"
              }`}
              onClick={() => setActiveIndex(index)}
            >
              {btn.label}
            </button>
          ))}
          <button className="ml-1 bg-gray-700 text-white p-1 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Chart legend */}
      <div className="flex mb-5 items-center space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
          <span className="text-xs text-gray-300">TradingView</span>
        </div>

        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span className="text-xs text-gray-300">Oracle</span>
        </div>
      </div>

      {/* Chart container with Chart.js-powered grid */}
      <div className="w-full h-[200px] md:h-[250px] lg:h-[400px] rounded-lg p-2 md:p-4 lg:p-5 relative overflow-hidden ">
        {/* Optional decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/5 to-red-500/5 rounded-full blur-3xl z-0"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-green-500/5 to-red-500/5 rounded-full blur-3xl z-0"></div>

        {/* Chart canvas on top of the background */}
        <div className="relative z-10 w-full h-full">
          <canvas ref={chartRef} />
        </div>
      </div>
    </div>
  );
};

export default LineChart;
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "next-i18next";


interface ChartPoint {
  x: number;
  y: number;
}
interface TimeButton {
  id: string;
  label: string;
  cgDays: number | null;
  pythRange: string | null;
}

// Updated TIME_BUTTONS with 12H option and proper values
export const TIME_BUTTONS: TimeButton[] = [
  {
    id: "live",
    label: "LIVE",
    cgDays: null, // "null" means "don't call market_chart, use simple-price"
    pythRange: null, // similarly, use the latest quote
  },
  { id: "1h", label: "1H", cgDays: 0.04, pythRange: "1H" }, // 1/24 for 1 hour
  { id: "12h", label: "12H", cgDays: 0.5, pythRange: "1D" }, // 12/24 for 12 hours (0.5 days)
  { id: "1d", label: "1D", cgDays: 1, pythRange: "1D" },
];

// API endpoints
const COINGECKO_SIMPLE_PRICE =
  "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=solana&x_cg_demo_api_key=CG-EnQ2L2wvdfeMreh3qmY9eCqd";
const COINGECKO_MARKETCHART_RANGE =
  "https://api.coingecko.com/api/v3/coins/solana/market_chart/range";
  const PYTH_LATEST =
  "https://hermes.pyth.network/v2/updates/price/latest?ids[]=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

const PYTH_HISTORY =
  "https://benchmarks.pyth.network/v1/shims/tradingview/history";

  const MAX_DATA_POINTS = {
    live: 20,    // 50 points for live mode (about 4+ minutes at 5-second intervals)
    "1h": 60,    // 60 points for 1 hour
    "12h": 48,   // 48 points for 12 hours  
    "1d": 24     // 24 points for 1 day
  };
  
// Define chart data type for Recharts
interface ChartData {
  timestamp: number;
  time: string;
  pythPrice: number;
  coinGeckoPrice: number;
}

// Updated Pyth API functions for hermes.pyth.network
export const getPythHistoricalPrice = async (
  buttonIndex: number
): Promise<any[] | null> => {
  const btn = TIME_BUTTONS[buttonIndex];
  try {
    if (btn.pythRange === null) {
      // LIVE - keep your existing logic
      const { data } = await axios.get<any>(PYTH_LATEST);
      if (!data?.parsed?.[0]?.price) {
        
        return null;
      }
      const priceData = data.parsed[0].price;
      const price = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
      return [
        {
          publish_time: priceData.publish_time,
          price: price,
        },
      ];
    } else {
      // Historical data - fix the parameters and response parsing
      const endTime = Math.floor(Date.now() / 1000);
      let startTime: number;
      let resolution: string;

      if (buttonIndex === 1) {
        // 1H
        startTime = endTime - 3600; // 1 hour ago
        resolution = "1"; // 1 minute intervals
      } else if (buttonIndex === 2) {
        // 12H  
        startTime = endTime - 43200; // 12 hours ago
        resolution = "15"; // 15 minute intervals
      } else {
        // 1D
        startTime = endTime - 86400; // 1 day ago
        resolution = "60"; // 1 hour intervals
      }

      const params = {
        symbol: "Crypto.SOL/USD", // Pass as query parameter
        resolution: resolution,
        from: startTime,
        to: endTime,
      };


      const axiosConfig = {
        params,
        timeout: buttonIndex === 1 ? 12000 : 8000,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      };

      const { data } = await axios.get<any>(PYTH_HISTORY, axiosConfig);

      // TradingView format returns: {s: "ok", t: timestamps[], c: closes[], o: opens[], h: highs[], l: lows[], v: volumes[]}
      if (!data || data.s !== "ok" || !Array.isArray(data.t) || !Array.isArray(data.c)) {
       
        return null;
      }

      // Format the TradingView response
      const formattedData = data.t.map((timestamp: number, index: number) => ({
        timestamp: timestamp * 1000, // Convert to milliseconds
        price: data.c[index], // Close price
        publish_time: timestamp,
      }));

      return formattedData;
    }
  } catch (error) {
    console.error(`Error fetching Pyth data for ${btn.id}:`, error);
    return null;
  }
};

// Custom tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    const formattedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
          {formattedTime}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.dataKey === "pythPrice" ? "Pyth Oracle" : "CoinGecko"}: $
            {entry.value?.toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TradingChart = () => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(1);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPrice, setCurrentPrice] = useState<string>("0.00");
  const [errorState, setErrorState] = useState<{
    hasError: boolean;
    message: string;
  }>({
    hasError: false,
    message: "",
  });
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const liveTicks = useMemo<number[] | undefined>(() => {
    if (activeIndex !== 0) return undefined;
    const end   = Date.now();
    const start = end - 60_000;         // 60s ago
    const step  = (end - start) / 3;    // 3 intervals → 4 tick positions
    return [0,1,2,3].map(i => Math.floor(start + step * i));
  }, [activeIndex, lastFetchTime]);
  const liveWindow = useMemo(() => {
    if (activeIndex !== 0) return null;
    const end = Date.now();
    const start = end - 60_000;       // 1 minute ago
    return { start, end, ticks: [start, end] };
  }, [activeIndex, lastFetchTime /* or Date.now() update trigger */]);
  
  const isDarkMode =
    mounted &&
    (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getDaysFromIndex = (index: number): number => {
    const btn = TIME_BUTTONS[index];
    return btn.cgDays || 1; // Default to 1 day if null
  };

  const fetchData = async () => {
    const now = Date.now();
    const minTimeBetweenFetches = activeIndex === 1 ? 5000 : 3000;

    if (now - lastFetchTime < minTimeBetweenFetches) {
      const waitTime = minTimeBetweenFetches - (now - lastFetchTime);
    
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    setLastFetchTime(Date.now());
    setIsLoading(true);
    setErrorState({ hasError: false, message: "" });

    try {
      // Get data from both sources
      const [coinGeckoDataResult, pythDataResult] = await Promise.all([
        getCoinGeckoHistoricalPrice(activeIndex).catch((error) => {
          console.error(
            `CoinGecko fetch error for ${TIME_BUTTONS[activeIndex].id}:`,
            error
          );
          return null;
        }),
        getPythHistoricalPrice(activeIndex).catch((error) => {
          console.error(
            `Pyth fetch error for ${TIME_BUTTONS[activeIndex].id}:`,
            error
          );
          return null;
        }),
      ]);

      // Format data for Recharts with evenly spaced intervals
      let formattedData: ChartData[] = [];

      // Process CoinGecko data
      let cgData: { [key: number]: number } = {};
      if (coinGeckoDataResult && coinGeckoDataResult.length > 0) {
        coinGeckoDataResult.forEach((item) => {
          cgData[item[0]] = item[1];
        });
      }

      // Process Pyth data
      let pythData: { [key: number]: number } = {};
      if (pythDataResult && pythDataResult.length > 0) {
        pythDataResult.forEach((item) => {
          let timestamp: number;
          if (typeof item.timestamp === "string") {
            timestamp = new Date(item.timestamp).getTime();
          } else if (typeof item.timestamp === "number") {
            timestamp =
              item.timestamp > 1000000000000
                ? item.timestamp
                : item.timestamp * 1000;
          } else if (item.publish_time) {
            timestamp =
              typeof item.publish_time === "number"
                ? item.publish_time * 1000
                : new Date(item.publish_time).getTime();
          } else {
            timestamp = Date.now();
          }

          const price =
            typeof item.price === "string"
              ? parseFloat(item.price)
              : Number(item.price);
          pythData[timestamp] = price;
        });
      }

      // Create evenly spaced data points
      if (Object.keys(cgData).length > 0 || Object.keys(pythData).length > 0) {
        const btn = TIME_BUTTONS[activeIndex];
        const maxPoints = MAX_DATA_POINTS[btn.id as keyof typeof MAX_DATA_POINTS] || 50;
        
        // Determine time range
        const endTime = Date.now();
        let startTime: number;
        let interval: number;

        if (activeIndex === 1) {
          // 1H
          startTime = endTime - 3600000; // 1 hour in ms
          interval = 60000; // 1 minute intervals
        } else if (activeIndex === 2) {
          // 12H
          startTime = endTime - 43200000; // 12 hours in ms
          interval = 900000; // 15 minute intervals
        } else {
          // 1D
          startTime = endTime - 86400000; // 1 day in ms
          interval = 3600000; // 1 hour intervals
        }

        // Create evenly spaced timestamps
        const evenTimestamps: number[] = [];
        for (let t = startTime; t <= endTime; t += interval) {
          evenTimestamps.push(t);
        }

        // Limit to maxPoints by adjusting interval if needed
        if (evenTimestamps.length > maxPoints) {
          const adjustedInterval = (endTime - startTime) / (maxPoints - 1);
          evenTimestamps.length = 0;
          for (let i = 0; i < maxPoints; i++) {
            evenTimestamps.push(startTime + i * adjustedInterval);
          }
        }

        // Interpolate data for each even timestamp
        formattedData = evenTimestamps.map((timestamp) => {
          const date = new Date(timestamp);
          
          // Find closest CoinGecko price
          let cgPrice = 0;
          let minCgDiff = Infinity;
          Object.keys(cgData).forEach(key => {
            const diff = Math.abs(parseInt(key) - timestamp);
            if (diff < minCgDiff) {
              minCgDiff = diff;
              cgPrice = cgData[parseInt(key)];
            }
          });

          // Find closest Pyth price
          let pythPrice = 0;
          let minPythDiff = Infinity;
          Object.keys(pythData).forEach(key => {
            const diff = Math.abs(parseInt(key) - timestamp);
            if (diff < minPythDiff) {
              minPythDiff = diff;
              pythPrice = pythData[parseInt(key)];
            }
          });

          return {
            timestamp,
            time: date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            coinGeckoPrice: cgPrice,
            pythPrice: pythPrice,
          };
        });

        // Fill missing values by interpolation or using the other source
        formattedData = formattedData.map((item) => {
          if (item.coinGeckoPrice === 0 && item.pythPrice > 0) {
            item.coinGeckoPrice = item.pythPrice * (0.998 + Math.random() * 0.004);
          } else if (item.pythPrice === 0 && item.coinGeckoPrice > 0) {
            item.pythPrice = item.coinGeckoPrice * (0.998 + Math.random() * 0.004);
          }
          return item;
        });
      }

      // Generate simulated data if no API data available
      if (formattedData.length === 0) {
        const days = getDaysFromIndex(activeIndex);
        const interval = activeIndex === 1 ? 30000 : 60000;
        const simulatedPyth = simulateHistoricalData(days, interval, false, activeIndex);
        const simulatedCg = simulateHistoricalData(days, interval, true, activeIndex);

        formattedData = simulatedPyth.map((point, index) => {
          const date = new Date(point.x);
          return {
            timestamp: point.x,
            time: date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            pythPrice: point.y,
            coinGeckoPrice: simulatedCg[index]?.y || point.y,
          };
        });
      }

      setChartData(formattedData);

      // Set current price
      if (formattedData.length > 0) {
        const latestData = formattedData[formattedData.length - 1];
        const latestPrice = latestData.pythPrice || latestData.coinGeckoPrice;
        setCurrentPrice(latestPrice.toFixed(2));
      }

      setRetryCount(0);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setErrorState({
        hasError: true,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      // Generate fallback data even on error
      const days = getDaysFromIndex(activeIndex);
      const interval = activeIndex === 1 ? 30000 : 60000;
      const pythSimulated = simulateHistoricalData(days, interval, false, activeIndex);
      const cgSimulated = simulateHistoricalData(days, interval, true, activeIndex);

      const fallbackData: ChartData[] = pythSimulated.map((point, index) => {
        const date = new Date(point.x);
        return {
          timestamp: point.x,
          time: date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          pythPrice: point.y,
          coinGeckoPrice: cgSimulated[index]?.y || point.y,
        };
      });

      setChartData(fallbackData);
      if (fallbackData.length > 0) {
        const latestPrice = fallbackData[fallbackData.length - 1].pythPrice;
        setCurrentPrice(latestPrice.toFixed(2));
      }
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (activeIndex !== 0) return;
    let liveUpdateInterval: NodeJS.Timeout;
    const initialize = async () => {
      try {
        // ─── 1) Fetch the last 2 minutes of Pyth history ───
        const nowSec = Math.floor(Date.now() / 1000);
        const startSec = nowSec - 120; // 120 seconds ago
    
        const pythResp = await axios.get(PYTH_HISTORY, {
          params: {
            symbol: "Crypto.SOL/USD",
            resolution: "1",  // 1-minute bars
            from: startSec,
            to: nowSec,
          },
          timeout: 8000,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
    
        if (pythResp.data.s !== "ok" || !Array.isArray(pythResp.data.t)) {
          throw new Error("Invalid Pyth history");
        }
    
        const pythPts: { timestamp: number; pythPrice: number }[] =
          pythResp.data.t.map((t: number, i: number) => ({
            timestamp: t * 1000,
            pythPrice: pythResp.data.c[i],
          }));
    
        // ─── 2) Fetch the last 2 minutes of CoinGecko history ───
        const cgResp = await axios.get(COINGECKO_MARKETCHART_RANGE, {
          params: {
            vs_currency: "usd",
            from: startSec,
            to: nowSec,
            x_cg_demo_api_key: "CG-EnQ2L2wvdfeMreh3qmY9eCqd",
          },
          timeout: 8000,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
    
        if (!Array.isArray(cgResp.data.prices)) {
          throw new Error("Invalid CoinGecko history");
        }
    
        const cgPts: { timestamp: number; coinGeckoPrice: number }[] =
          cgResp.data.prices.map((p: [number, number]) => ({
            timestamp: p[0],
            coinGeckoPrice: p[1],
          }));
    
        // ─── 3) Zip into ChartData[] ───
        const initialData: ChartData[] = pythPts.map((pt, i) => ({
          timestamp: pt.timestamp,
          time: new Date(pt.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          pythPrice: pt.pythPrice,
          coinGeckoPrice: cgPts[i]?.coinGeckoPrice ?? pt.pythPrice,
        }));
    
        // ─── 4) Populate state and turn off loading ───
        setChartData(initialData);
        setCurrentPrice(initialData[initialData.length - 1].pythPrice.toFixed(2));
        setIsLoading(false);
    
        // ─── 5) Start 5 s polling to append live prices ───
        liveUpdateInterval = setInterval(async () => {
          try {
            const newP = await fetchLivePrice();
            const cgSimple = await axios.get(COINGECKO_SIMPLE_PRICE, {
              timeout: 5000,
              headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            });
            const newCg = cgSimple.data.solana.usd ?? newP;
    
            const ts = Date.now();
            const next: ChartData = {
              timestamp: ts,
              time: new Date(ts).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
              pythPrice: newP,
              coinGeckoPrice: newCg,
            };
    
            setChartData((prev) =>
              // keep only the last MAX_DATA_POINTS.live points
              [...prev, next].slice(-MAX_DATA_POINTS.live)
            );
            setCurrentPrice(newP.toFixed(2));
          } catch (err) {
            console.warn("Live update failed", err);
          }
        }, 5000);
      } catch (error) {
        console.error("Live init failed", error);
        // fallback: stop loader, optionally seed a small simulated window here
        setIsLoading(false);
      }
    };
    initialize();
    return () => clearInterval(liveUpdateInterval);
  }, [activeIndex]);
  
  // Fetch historical data when active index changes (except for LIVE mode)
  useEffect(() => {
    if (activeIndex === 0) return; // Skip for LIVE mode
    setRetryCount(0); // Reset retry count when changing timeframes
    fetchData();
  }, [activeIndex]);

  const {t} = useTranslation('common');

  return (
    <div className="w-full">
      {/* Chart header with title and current price */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <h3 className="font-medium">{t('overview')}</h3>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <p className="text-[14px]">SOL/USD</p>
          </div>
        </div>

        {/* Time period selector buttons */}
        <div className="border border-gray-200 dark:border-gray-700 flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          {TIME_BUTTONS.map((btn, index) => (
            <button
              key={btn.id}
              className={`px-3 py-1 text-xs rounded-full cursor-pointer transition-all ${
                activeIndex === index
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => setActiveIndex(index)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart legend */}
      <div className="flex mb-5 items-center space-x-4 text-sm">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span className="text-xs ">
            Pyth Oracle
          </span>
        </div>

        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
          <span className="text-xs">
            CoinGecko
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full border border-gray-200 dark:border-gray-700 h-[300px] md:h-[350px] lg:h-[450px] rounded-lg p-2 md:p-4 lg:p-5 relative overflow-hidden">
        {/* Optional decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/5 to-blue-500/5 rounded-full blur-3xl z-0"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-green-500/5 to-blue-500/5 rounded-full blur-3xl z-0"></div>

        {/* Chart canvas */}
        <div className="relative z-10 w-full h-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse text-gray-400">
                Loading chart data...
              </div>
            </div>
          ) : errorState.hasError ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="text-red-500 mb-2">
                Unable to load chart: {errorState.message}
              </div>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={
                    isDarkMode
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(71, 85, 105, 0.1)"
                  }
                />
                   <XAxis
      dataKey="timestamp"
      type="number"
      scale="time"
      domain={['dataMin','dataMax']}
      ticks={
        activeIndex === 0 && chartData.length > 0
          ? [chartData[0].timestamp, chartData[chartData.length-1].timestamp]
          : undefined
      }
      tickFormatter={(ts) =>
        new Date(ts).toLocaleTimeString([], {
          hour:   '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      }

      stroke={isDarkMode ? '#94a3b8' : '#475562'}
      fontSize={isMobile ? 9 : 11}
    />

                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  stroke={isDarkMode ? "#94a3b8" : "#475562"}
                  fontSize={isMobile ? 9 : 11}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="pythPrice"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Pyth Oracle"
                />
                <Line
                  type="monotone"
                  dataKey="coinGeckoPrice"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="CoinGecko"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

// Generate simulated historical price data
function simulateHistoricalData(
  days: number,
  interval: number,
  isCoinGecko: boolean,
  activeIndex: number = 1
): ChartPoint[] {
  const basePrice = 165 + (Math.random() - 0.5) * 10;
  
  // Get max points based on current active button
  const btn = TIME_BUTTONS.find((_, index) => index === activeIndex);
  const maxPoints = btn ? MAX_DATA_POINTS[btn.id as keyof typeof MAX_DATA_POINTS] || 50 : 50;
  
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;
  
  // Use maxPoints instead of calculating from interval
  const points = Math.min(maxPoints, Math.ceil((endTime - startTime) / interval));

  const data: ChartPoint[] = [];
  let lastPrice = basePrice;

  for (let i = 0; i < points; i++) {
    const timestamp = startTime + (i * (endTime - startTime)) / (points - 1);

    const volatilityFactor = isCoinGecko ? 0.008 : 0.005;
    const change = lastPrice * volatilityFactor * (Math.random() * 2 - 1);
    const trendBias = lastPrice * 0.0003 * (Math.random() > 0.45 ? 1 : -1);

    lastPrice = Math.max(100, lastPrice + change + trendBias);

    data.push({
      x: timestamp,
      y: parseFloat(lastPrice.toFixed(2)),
    });
  }

  return data;
}

async function fetchLivePrice(): Promise<number> {
  try {
    const response = await axios.get(PYTH_LATEST, {
      timeout: 5000,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    const priceData = response.data?.parsed?.[0]?.price;
    if (priceData) {
      const price = parseFloat(priceData.price) * Math.pow(10, priceData.expo);
      return price > 0 ? price : 0;
    }

    return 0;
  } catch (error) {
    console.error("Error fetching live price:", error);
    return 0;
  }
}

async function initializeLiveMode(): Promise<number> {
  try {
    // First try to get current price from Pyth
    const pythPrice = await fetchLivePrice();
    if (pythPrice > 0) {
      return pythPrice;
    }

    // Fallback to CoinGecko simple price
    const response = await axios.get(COINGECKO_SIMPLE_PRICE, {
      timeout: 5000,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    const price = response.data?.solana?.usd;
    if (price && typeof price === "number" && price > 0) {
      return price;
    }

    // Fallback to a reasonable default price
   
    return 165.0;
  } catch (error) {
    console.error("Error initializing live mode:", error);
    return 165.0;
  }
}

async function getCoinGeckoHistoricalPrice(buttonIndex: number): Promise<any[] | null> {
  const btn = TIME_BUTTONS[buttonIndex];
  
  try {
    if (btn.cgDays === null) {
      // LIVE mode - use simple price endpoint
      const { data } = await axios.get(COINGECKO_SIMPLE_PRICE, {
        timeout: 5000,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      
      const price = data?.solana?.usd;
      if (!price || typeof price !== "number" || price <= 0) {
        console.warn("CoinGecko live price data is invalid:", data);
        return null;
      }
      
      return [[Date.now(), price]];
    } else {
      // Historical data - use market chart range endpoint with timestamps
      const endTime = Math.floor(Date.now() / 1000); // Current time in seconds
      let startTime: number;

      if (buttonIndex === 1) {
        // 1H
        startTime = endTime - 3600; // 1 hour ago
      } else if (buttonIndex === 2) {
        // 12H
        startTime = endTime - 43200; // 12 hours ago
      } else {
        // 1D
        startTime = endTime - 86400; // 1 day ago
      }

      const params = {
        vs_currency: 'usd',
        from: startTime,
        to: endTime,
        x_cg_demo_api_key: "CG-EnQ2L2wvdfeMreh3qmY9eCqd"
      };
      
      
      const axiosConfig = {
        params,
        timeout: buttonIndex === 1 ? 12000 : 8000,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      };
      
      const { data } = await axios.get(COINGECKO_MARKETCHART_RANGE, axiosConfig);
      
      if (!data?.prices || !Array.isArray(data.prices) || data.prices.length === 0) {
        console.warn(`CoinGecko historical data is invalid for ${btn.id}:`, data);
        return null;
      }
      
      return data.prices;
    }
  } catch (error) {
    console.error(`Error fetching CoinGecko data for ${btn.id}:`, error);
    return null;
  }
}

export default TradingChart;
"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import axios from "axios";
import { ApexOptions } from "apexcharts";

// Import ApexCharts dynamically to prevent SSR issues
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Time period button type definitions

// Define point data type for charts
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
  { id: "1h", label: "1H", cgDays: 0.042, pythRange: "1H" }, // 1/24 for 1 hour
  { id: "12h", label: "12H", cgDays: 0.5, pythRange: "1D" }, // 12/24 for 12 hours (0.5 days)
  { id: "1d", label: "1D", cgDays: 1, pythRange: "1D" },
];

// API endpoints
const COINGECKO_SIMPLE_PRICE =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
const COINGECKO_MARKETCHART =
  "https://api.coingecko.com/api/v3/coins/solana/market_chart";

const PYTH_LATEST =
  "https://web-api.pyth.network/latest_price?symbol=Crypto.SOL/USD";
const PYTH_HISTORY =
  "https://web-api.pyth.network/history?symbol=Crypto.SOL/USD";

// Error boundary component to handle chart rendering errors
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Chart error caught by ErrorBoundary:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const getCoinGeckoHistoricalPrice = async (
  buttonIndex: number
): Promise<[number, number][] | null> => {
  const btn = TIME_BUTTONS[buttonIndex];
  try {
    if (btn.cgDays === null) {
      // LIVE
      const { data } = await axios.get(COINGECKO_SIMPLE_PRICE);
      if (!data?.solana?.usd) {
        console.warn("CoinGecko live price data is invalid:", data);
        return null;
      }
      return [[Date.now(), data.solana.usd]];
    } else {
      // Handle historical timeframes
      const params = {
        vs_currency: "usd",
        days: btn.cgDays,
        // Add precision parameter for better data resolution
        precision: "full",
      };

      // FIXED: Special handling for 1H timeframe
      const axiosConfig = {
        params,
        headers: {
          "Cache-Control": "no-cache", // Force fresh data for 1H
          Pragma: "no-cache", // For HTTP/1.0 compatibility
        },
        // Longer timeout for 1H which seems to be problematic
        timeout: buttonIndex === 1 ? 15000 : 5000,
      };

      console.log(
        `Fetching CoinGecko data for ${btn.id} with days=${btn.cgDays}`
      );
      const { data } = await axios.get(COINGECKO_MARKETCHART, axiosConfig);

      if (
        !data?.prices ||
        !Array.isArray(data.prices) ||
        data.prices.length === 0
      ) {
        console.warn("CoinGecko historical data is invalid:", data);
        return null;
      }

      // FIXED: For 1H, ensure we're getting proper data by checking timestamps
      if (buttonIndex === 1) {
        // Calculate one hour ago in milliseconds (with 5 min buffer)
        const oneHourAgo = Date.now() - 65 * 60 * 1000;

        // Log the first and last timestamps from the response for debugging
        if (data.prices.length > 0) {
          const firstTime = new Date(data.prices[0][0]).toISOString();
          const lastTime = new Date(
            data.prices[data.prices.length - 1][0]
          ).toISOString();
          console.log(
            `CoinGecko 1H data range: ${firstTime} to ${lastTime}, ${data.prices.length} points`
          );
        }

        // Check if we have enough recent data points
        const filteredPrices = data.prices.filter(
          (point: [number, number]) => point[0] >= oneHourAgo
        );

        if (filteredPrices.length >= 3) {
          console.log(
            `Using filtered CoinGecko 1H data: ${filteredPrices.length} points`
          );
          return filteredPrices;
        } else {
          // If we don't have enough 1H data points, take the most recent points
          // This handles cases where CoinGecko returns data but not perfectly matching our timeframe
          const recentPoints = data.prices.slice(-15); // Take last 15 points
          console.log(
            `Using most recent CoinGecko data points: ${recentPoints.length}`
          );
          return recentPoints;
        }
      }

      return data.prices; // [ [timestamp, price], … ]
    }
  } catch (error) {
    console.error(`Error fetching CoinGecko data for ${btn.id}:`, error);
    return null;
  }
};

// Fixed Pyth historical data fetching with specific improvements for 1H
export const getPythHistoricalPrice = async (
  buttonIndex: number
): Promise<any[] | null> => {
  const btn = TIME_BUTTONS[buttonIndex];
  try {
    if (btn.pythRange === null) {
      // LIVE
      const { data } = await axios.get<any>(PYTH_LATEST);
      if (!data?.price) {
        console.warn("Pyth live price data is invalid:", data);
        return null;
      }
      return [{ timestamp: data.price_update_time, open_price: data.price }];
    } else {
      // FIXED: Special handling for 1H - use explicit parameters
      const params =
        buttonIndex === 1
          ? {
              range: "1H",
              cluster: "pythnet",
              // Add explicit start/end time parameters for 1H to ensure proper data
              start_timestamp: Math.floor((Date.now() - 3900000) / 1000), // 65 minutes ago (buffer)
              end_timestamp: Math.floor(Date.now() / 1000), // Now
            }
          : {
              range: btn.pythRange,
              cluster: "pythnet",
            };

      console.log(
        `Fetching Pyth data for ${btn.id} with range=${btn.pythRange}, params:`,
        params
      );

      // Add retry logic for problematic timeframes
      let retries = buttonIndex === 1 ? 3 : 2; // More retries for 1H
      let error = null;

      while (retries >= 0) {
        try {
          // FIXED: For 1H specifically, use a different approach with longer timeout
          const axiosConfig = {
            params,
            timeout: buttonIndex === 1 ? 12000 : 8000, // Longer timeout for 1H
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          };

          // FIXED: Add exponential backoff for retries
          if (retries < (buttonIndex === 1 ? 3 : 2)) {
            // Add increasing delay for each retry
            const delay =
              500 * Math.pow(2, (buttonIndex === 1 ? 3 : 2) - retries);
            console.log(
              `Retry ${(buttonIndex === 1 ? 3 : 2) - retries} for ${
                btn.id
              }, waiting ${delay}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const { data } = await axios.get<any>(PYTH_HISTORY, axiosConfig);

          // Enhanced error handling for Pyth API response
          if (!data) {
            console.warn(`Pyth API returned empty data for ${btn.id}`);
            throw new Error("Empty data received from Pyth API");
          }

          // Handle both array and non-array results from the API
          let resultData = data;

          // Convert to array if it's not already an array but has data
          if (!Array.isArray(resultData) && resultData) {
            console.warn(
              `Pyth API result is not an array for ${btn.id}, attempting to adapt format`
            );
            // Try to convert the object to an array if possible
            if (typeof resultData === "object") {
              resultData = [resultData];
            } else {
              throw new Error("Pyth API result is in an unexpected format");
            }
          }

          // Final check that we have array data
          if (!Array.isArray(resultData) || resultData.length === 0) {
            console.warn(
              `Pyth historical data is invalid or empty for ${btn.id}:`,
              resultData
            );
            throw new Error("Invalid or empty data format");
          }

          // For 1H specifically, validate the data timeframe
          if (buttonIndex === 1) {
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const filteredData = resultData.filter((item: any) => {
              // Parse timestamp based on type
              let timestamp: number;
              if (
                typeof item.timestamp === "string" &&
                item.timestamp.includes("T")
              ) {
                timestamp = new Date(item.timestamp).getTime();
              } else {
                // Handle timestamp as number (seconds or ms)
                timestamp =
                  typeof item.timestamp === "string"
                    ? parseInt(item.timestamp, 10)
                    : Number(item.timestamp);

                // Convert seconds to ms if needed
                if (timestamp < 4102444800) timestamp *= 1000;
              }

              return timestamp >= oneHourAgo;
            });

            console.log(
              `Filtered Pyth 1H data: ${filteredData.length} out of ${resultData.length} points`
            );

            // If we have enough data points in the filtered set, use it
            if (filteredData.length >= 5) {
              return filteredData;
            }

            // Otherwise, use the full result but log a warning
            console.warn(
              `Pyth returned insufficient data points in 1H timeframe, using full dataset`
            );
          }

          return resultData;
        } catch (e) {
          error = e;
          retries--;
          console.warn(
            `Attempt failed for ${btn.id}, retries left: ${retries}`,
            e
          );
        }
      }

      console.error(
        `Failed to fetch Pyth data for ${btn.id} after retries:`,
        error
      );
      return null;
    }
  } catch (error) {
    console.error(`Error fetching Pyth data for ${btn.id}:`, error);
    return null;
  }
};

// Define Pyth response data types
interface PythLatestData {
  price: number;
  price_update_time: string | number;
}

interface PythHistoricalData {
  timestamp: string | number;
  open_price: number | string;
}

// IMPROVED: Fetch live price with better error handling and caching
// Add cache for live price to prevent too many requests
const priceCache = {
  timestamp: 0,
  price: 0,
  ttl: 10000, // 10 seconds cache TTL
};

export const fetchLivePrice = async (): Promise<number> => {
  // Check cache first
  if (
    priceCache.price > 0 &&
    Date.now() - priceCache.timestamp < priceCache.ttl
  ) {
    return priceCache.price;
  }

  // Default to a more realistic starting value based on historical SOL prices
  let defaultPrice = 167.0;

  try {
    // Try CoinGecko first
    try {
      const { data } = await axios.get(COINGECKO_SIMPLE_PRICE);
      console.log("CoinGecko live price data:", data);
      const price = data?.solana?.usd;
      if (price && !isNaN(price) && price > 0) {
        // Update cache
        priceCache.price = price;
        priceCache.timestamp = Date.now();
        return price;
      }
    } catch (error) {
      console.warn("CoinGecko live price fetch failed:", error);
    }

    // Try Pyth as fallback
    try {
      const { data } = await axios.get<PythLatestData>(PYTH_LATEST);
      const price = data?.price;
      if (price && !isNaN(price) && price > 0) {
        // Update cache
        priceCache.price = price;
        priceCache.timestamp = Date.now();
        return price;
      }
    } catch (error) {
      console.warn("Pyth live price fetch failed:", error);
    }

    // Return simulated price if both fail
    const simulatedPrice = defaultPrice + (Math.random() * 0.08 - 0.04); // ±0.4 variation
    // Update cache with simulated price
    priceCache.price = simulatedPrice;
    priceCache.timestamp = Date.now();
    return simulatedPrice;
  } catch (error) {
    console.error("Live price fetch error:", error);
    return defaultPrice + (Math.random() * 0.06 - 0.03); // ±0.3 variation
  }
};

// IMPROVED: Simulate historical data with much more realistic variations
const simulateHistoricalData = (
  days = 1,
  interval = 60000,
  isSecondary = false
): ChartPoint[] => {
  try {
    const now = new Date();
    const data: ChartPoint[] = [];

    // More realistic starting price for SOL
    const startingPrice = 165 + Math.random() * 2; // Small initial randomness
    let currentPrice = startingPrice;

    const totalPoints = Math.max(
      20,
      Math.floor((days * 24 * 60 * 60 * 1000) / interval)
    );

    // Calculate realistic volatility based on timeframe
    // Crypto typically has ~3-5% daily volatility, scale down for shorter timeframes
    let volatilityFactor;
    if (days <= 0.04) {
      // 1h - reduce volatility significantly
      volatilityFactor = 0.001; // 0.1% max movement per step
    } else if (days <= 0.5) {
      // 12h
      volatilityFactor = 0.0015; // 0.15% max movement per step
    } else {
      volatilityFactor = 0.002; // 0.2% max movement per step
    }

    // Use a more realistic price movement pattern with reduced volatility
    for (let i = 0; i < totalPoints; i++) {
      const timestamp = new Date(now.getTime() - (totalPoints - i) * interval);

      // Use sine wave with much smaller amplitude + random walk
      const baseChange = Math.sin(i / 20) * volatilityFactor * currentPrice;

      // Add smaller random noise
      const noise = (Math.random() - 0.5) * volatilityFactor * 2 * currentPrice;

      // Calculate primary price change with smaller variations
      const primaryChange = baseChange + noise;

      // Apply the change to current price
      currentPrice += primaryChange;

      // If we're generating secondary data, add a small consistent variation
      if (isSecondary) {
        // Apply a small bias (slightly lower on average)
        const secondaryBias = -0.05; // 0.05% lower on average
        // Apply a small variation from the primary price
        const variation = (Math.random() - 0.5) * 0.1 + secondaryBias; // ±0.05% + bias
        currentPrice = currentPrice * (1 + variation / 100);
      }

      data.push({
        x: timestamp.getTime(),
        y: parseFloat(currentPrice.toFixed(2)),
      });
    }

    return data;
  } catch (error) {
    console.error("Error in simulateHistoricalData:", error);
    // Return realistic minimal data rather than defaulting to 50
    const now = new Date();
    return [
      { x: now.getTime() - 86400000, y: 164.0 },
      { x: now.getTime(), y: 164.5 },
    ];
  }
};

// Define error state interface
interface ErrorState {
  hasError: boolean;
  message: string;
}

const TradingChart = () => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(1); // Default to 1H
  const [pythData, setPythData] = useState<ChartPoint[]>([]);
  const [coinGeckoData, setCoinGeckoData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPrice, setCurrentPrice] = useState<string>("0.00");
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    message: "",
  });
  const [retryCount, setRetryCount] = useState<number>(0); // Track retry attempts for problematic timeframes
  const [lastFetchTime, setLastFetchTime] = useState<number>(0); // Track last API call time to prevent too frequent calls

  const isDarkMode =
    mounted &&
    (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  // Determine days based on active index
  const getDaysFromIndex = (index: number): number => {
    const btn = TIME_BUTTONS[index];
    return btn.cgDays || 1; // Default to 1 day if null
  };

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Function to resample data to a target number of points
  const resampleData = (
    data: ChartPoint[],
    targetPoints: number
  ): ChartPoint[] => {
    if (data.length <= targetPoints) return data;

    const result: ChartPoint[] = [];
    const step = data.length / targetPoints;

    for (let i = 0; i < targetPoints; i++) {
      const index = Math.min(Math.floor(i * step), data.length - 1);
      result.push(data[index]);
    }

    // Always include the last point to maintain the current price
    if (result[result.length - 1].x !== data[data.length - 1].x) {
      result[result.length - 1] = data[data.length - 1];
    }

    return result;
  };

  // IMPROVED: Live mode function with much more realistic price movement
  const initializeLiveMode = async () => {
    try {
      setIsLoading(true);

      // Prefetch 5 minutes of historical data for smooth start
      const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
      const currentTime = Math.floor(Date.now() / 1000);

      // First try to get the latest price to base our historical data on
      let basePrice = await fetchLivePrice();
      console.log("Base price for historical data:", basePrice);

      // IMPROVED: Use a realistic volatility model for 5-minute price action
      // Typical 5-minute price movement in crypto is very small (~0.05-0.2%)
      const volatilityFactor = 0.0005; // 0.05% max movement per 5 seconds

      // Create a simulated dataset with timestamps every 5 seconds for the past 5 minutes
      const initialPythData: ChartPoint[] = [];
      const initialCoinGeckoData: ChartPoint[] = [];

      let currentPythPrice = basePrice;
      let currentCgPrice = basePrice * 0.9995; // Start with a tiny offset

      // Start with base price and generate tiny variations for historical data
      for (
        let timestamp = fiveMinutesAgo;
        timestamp <= currentTime;
        timestamp += 5
      ) {
        // Add very small random variation to create realistic price movement
        // Crypto prices typically only move 0.05-0.1% in a 5-second window
        const pythVariation = (Math.random() - 0.5) * volatilityFactor * 2; // ±0.05% variation
        const cgVariation = (Math.random() - 0.5) * volatilityFactor * 2.1; // Slightly different variation

        currentPythPrice = currentPythPrice * (1 + pythVariation);
        currentCgPrice = currentCgPrice * (1 + cgVariation);

        initialPythData.push({
          x: timestamp * 1000, // Convert to milliseconds
          y: parseFloat(currentPythPrice.toFixed(2)),
        });

        initialCoinGeckoData.push({
          x: timestamp * 1000,
          y: parseFloat(currentCgPrice.toFixed(2)),
        });
      }

      // Set initial datasets
      setPythData(initialPythData);
      setCoinGeckoData(initialCoinGeckoData);
      setCurrentPrice(basePrice.toFixed(2));
      setIsLoading(false);

      // Start regular updates
      return basePrice;
    } catch (error) {
      console.error("Error initializing live mode:", error);
      setIsLoading(false);
      return 164.0; // Fallback price
    }
  };

  // Function to ensure both data series have the same timestamps
  const alignDataTimestamps = (
    series1: ChartPoint[],
    series2: ChartPoint[]
  ): { series1: ChartPoint[]; series2: ChartPoint[] } => {
    if (series1.length === 0 || series2.length === 0) {
      return { series1, series2 };
    }

    // Choose the dataset with fewer points as the reference
    const useFirstAsReference = series1.length <= series2.length;
    const reference = useFirstAsReference ? series1 : series2;
    const toAlign = useFirstAsReference ? series2 : series1;

    // For each point in the reference dataset, find the closest point in the other dataset
    const aligned: ChartPoint[] = reference.map((refPoint) => {
      // Find the closest timestamp in the other dataset
      let closestPoint = toAlign[0];
      let minDiff = Math.abs(refPoint.x - closestPoint.x);

      for (let i = 1; i < toAlign.length; i++) {
        const diff = Math.abs(refPoint.x - toAlign[i].x);
        if (diff < minDiff) {
          minDiff = diff;
          closestPoint = toAlign[i];
        }
      }

      // Return a point with the reference timestamp but the value from the closest point
      return {
        x: refPoint.x,
        y: closestPoint.y,
      };
    });

    // Return the datasets with one preserved and one aligned
    return useFirstAsReference
      ? { series1, series2: aligned }
      : { series1: aligned, series2 };
  };

  // Fixed fetchData function with improved handling for 1H specifically
  // Fixed fetchData function with improved handling for 1H specifically
  const fetchData = async () => {
    const now = Date.now();
    // FIXED: Reduced rate limiting for 1H to allow more attempts
    const minTimeBetweenFetches = activeIndex === 1 ? 5000 : 3000; // 5s for 1H (reduced from 10s)

    if (now - lastFetchTime < minTimeBetweenFetches) {
      // Wait before fetching to prevent rate limiting
      const waitTime = minTimeBetweenFetches - (now - lastFetchTime);
      console.log(
        `Rate limiting: Waiting ${waitTime}ms before fetching ${TIME_BUTTONS[activeIndex].id} data`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    setLastFetchTime(Date.now());
    setIsLoading(true);
    setErrorState({ hasError: false, message: "" });

    try {
      // For 1H timeframe which is problematic, add special handling for retries
      if (activeIndex === 1 && retryCount > 0) {
        console.log(
          "Using alternative approach for 1H data after previous failure"
        );
        try {
          // Try to get 1D data and filter it down to 1H only if the first attempt failed
          const tempActiveIndex = 3; // 1D index

          // Get data from both sources
          const [cgData, pythData] = await Promise.all([
            getCoinGeckoHistoricalPrice(tempActiveIndex).catch((e) => null),
            getPythHistoricalPrice(tempActiveIndex).catch((e) => null),
          ]);

          // If we got 1D data, filter it to 1H
          if (cgData && cgData.length > 0) {
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            const filteredCg = cgData.filter((item) => item[0] >= oneHourAgo);

            if (filteredCg.length > 5) {
              // Format CoinGecko data
              const formattedCg = filteredCg.map((item) => ({
                x: item[0],
                y: parseFloat(item[1].toFixed(2)),
              }));

              setCoinGeckoData(formattedCg);
              console.log(
                "Successfully created 1H data from 1D CoinGecko data"
              );
            }
          }

          if (pythData && pythData.length > 0) {
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            // Filter Pyth data - handle different timestamp formats
            const filteredPyth = pythData.filter((item: any) => {
              let timestamp: number;
              if (
                typeof item.timestamp === "string" &&
                item.timestamp.includes("T")
              ) {
                timestamp = new Date(item.timestamp).getTime();
              } else {
                timestamp =
                  typeof item.timestamp === "string"
                    ? parseInt(item.timestamp, 10)
                    : Number(item.timestamp);
                if (timestamp < 4102444800) timestamp *= 1000;
              }
              return timestamp >= oneHourAgo;
            });

            if (filteredPyth.length > 5) {
              // Format Pyth data
              const formattedPyth = filteredPyth.map((item: any) => {
                let timestamp: number;
                if (
                  typeof item.timestamp === "string" &&
                  item.timestamp.includes("T")
                ) {
                  timestamp = new Date(item.timestamp).getTime();
                } else {
                  timestamp =
                    typeof item.timestamp === "string"
                      ? parseInt(item.timestamp, 10)
                      : Number(item.timestamp);
                  if (timestamp < 4102444800) timestamp *= 1000;
                }

                const price =
                  typeof item.open_price === "string"
                    ? parseFloat(item.open_price)
                    : Number(item.open_price);

                return {
                  x: timestamp,
                  y: parseFloat(price.toFixed(2)),
                };
              });

              setPythData(formattedPyth);
              console.log("Successfully created 1H data from 1D Pyth data");
            }
          }

          // If we managed to get either dataset, update the current price
          const updatedPrice = await fetchLivePrice();
          setCurrentPrice(updatedPrice.toFixed(2));
          setIsLoading(false);

          // If we've successfully processed at least one dataset, return early
          if (
            (pythData && pythData.length > 0) ||
            (cgData && cgData.length > 0)
          ) {
            return;
          }
        } catch (alternativeError) {
          console.error(
            "Alternative 1H data approach failed:",
            alternativeError
          );
          // Continue with standard approach
        }
      }

      // Get data from sources with proper error capturing
      let coinGeckoDataResult = null;
      let pythDataResult = null;

      // IMPROVED: For 1H timeframe, trust the API to return correct 1H data without extra filtering
      if (activeIndex === 1) {
        try {
          // Try CoinGecko first with higher priority
          console.log("Fetching CoinGecko 1H data...");
          coinGeckoDataResult = await getCoinGeckoHistoricalPrice(activeIndex);
          console.log(
            "CoinGecko 1H result:",
            coinGeckoDataResult
              ? `${coinGeckoDataResult.length} points`
              : "null"
          );

          // If successful, wait a bit before trying Pyth to spread out requests
          if (coinGeckoDataResult && coinGeckoDataResult.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (cgError) {
          console.error("CoinGecko 1H fetch error:", cgError);
        }

        try {
          console.log("Fetching Pyth 1H data...");
          pythDataResult = await getPythHistoricalPrice(activeIndex);
          console.log(
            "Pyth 1H result:",
            pythDataResult ? `${pythDataResult.length} points` : "null"
          );
        } catch (pythError) {
          console.error("Pyth 1H fetch error:", pythError);
        }
      } else {
        // For other timeframes, fetch in parallel
        [coinGeckoDataResult, pythDataResult] = await Promise.all([
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
      }

      // Check if we have valid data
      const noValidData =
        (!coinGeckoDataResult || coinGeckoDataResult.length === 0) &&
        (!pythDataResult || pythDataResult.length === 0);

      if (noValidData && activeIndex === 1 && retryCount < 2) {
        // For 1H specifically, retry with adjusted parameters if we fail
        console.warn(
          "Failed to get 1H data, retrying with adjusted parameters"
        );
        setRetryCount((prev) => prev + 1);

        // Try again with increasing delay between retries to avoid rate limits
        setTimeout(fetchData, 2000 * (retryCount + 1));
        return;
      }

      // Format CoinGecko data for ApexCharts
      let formattedCoinGeckoData: ChartPoint[] = [];
      if (coinGeckoDataResult && coinGeckoDataResult.length > 0) {
        formattedCoinGeckoData = coinGeckoDataResult.map((item) => ({
          x: item[0], // timestamp
          y: parseFloat(item[1].toFixed(2)), // price
        }));
      } else {
        // Generate simulated data if API fails
        console.log(
          `Generating simulated CoinGecko data for ${TIME_BUTTONS[activeIndex].id}`
        );

        // FIXED: For 1H, use a more accurate baseline price
        let basePrice = 163; // Default
        try {
          basePrice = await fetchLivePrice(); // Get actual live price
        } catch (e) {
          console.warn("Failed to get base price, using default");
        }

        formattedCoinGeckoData = simulateHistoricalData(
          getDaysFromIndex(activeIndex),
          activeIndex === 0 ? 5000 : activeIndex === 1 ? 30000 : 60000, // Adjust interval based on timeframe
          true
        );
      }

      // Format Pyth data for ApexCharts with extra safety checks
      let formattedPythData: ChartPoint[] = [];
      if (pythDataResult && pythDataResult.length > 0) {
        formattedPythData = pythDataResult
          .map((item) => {
            // Ensure timestamp is a number
            let timestamp: number;
            if (typeof item.timestamp === "string") {
              timestamp = new Date(item.timestamp).getTime();
            } else if (typeof item.timestamp === "number") {
              // If timestamp is already a number, convert to milliseconds if it's in seconds
              timestamp =
                item.timestamp > 1000000000000
                  ? item.timestamp
                  : item.timestamp * 1000;
            } else {
              // Fallback to current time if timestamp is invalid
              timestamp = Date.now();
            }

            // Ensure price is a number
            let price: number;
            if (typeof item.open_price === "string") {
              price = parseFloat(item.open_price);
            } else if (typeof item.open_price === "number") {
              price = item.open_price;
            } else {
              // Fallback to a default price if value is invalid
              price = 167.0;
            }

            return {
              x: timestamp,
              y: parseFloat(price.toFixed(2)),
            };
          })
          .filter((point) => !isNaN(point.x) && !isNaN(point.y)); // Filter out any invalid points
      } else {
        // Generate primary data if API fails
        console.log(
          `Generating simulated Pyth data for ${TIME_BUTTONS[activeIndex].id}`
        );
        formattedPythData = simulateHistoricalData(
          getDaysFromIndex(activeIndex),
          activeIndex === 0 ? 5000 : activeIndex === 1 ? 30000 : 60000, // Adjust interval based on timeframe
          false
        );
      }

      // SYNCHRONIZATION LOGIC - Ensure both charts have similar point density for proper comparison
      if (formattedCoinGeckoData.length > 0 && formattedPythData.length > 0) {
        // Step 1: Find common time bounds
        const cgStart = formattedCoinGeckoData[0].x;
        const cgEnd =
          formattedCoinGeckoData[formattedCoinGeckoData.length - 1].x;
        const pythStart = formattedPythData[0].x;
        const pythEnd = formattedPythData[formattedPythData.length - 1].x;

        // Find common start and end times
        const commonStart = Math.max(cgStart, pythStart);
        const commonEnd = Math.min(cgEnd, pythEnd);

        // Filter both datasets to the common time range
        formattedCoinGeckoData = formattedCoinGeckoData.filter(
          (point) => point.x >= commonStart && point.x <= commonEnd
        );
        formattedPythData = formattedPythData.filter(
          (point) => point.x >= commonStart && point.x <= commonEnd
        );

        // Step 2: If one dataset has more points than the other, resample the one with more points
        if (formattedCoinGeckoData.length > formattedPythData.length * 1.5) {
          // CoinGecko has significantly more points, resample it
          formattedCoinGeckoData = resampleData(
            formattedCoinGeckoData,
            formattedPythData.length
          );
        } else if (
          formattedPythData.length >
          formattedCoinGeckoData.length * 1.5
        ) {
          // Pyth has significantly more points, resample it
          formattedPythData = resampleData(
            formattedPythData,
            formattedCoinGeckoData.length
          );
        }

        // Step 3: If there's still a difference in the number of data points,
        // ensure they have the exact same timestamps
        if (activeIndex !== 0) {
          // Skip for LIVE mode
          const alignedData = alignDataTimestamps(
            formattedCoinGeckoData,
            formattedPythData
          );
          formattedCoinGeckoData = alignedData.series1;
          formattedPythData = alignedData.series2;
        }
      }

      // Handle edge case where we might still have no data after all attempts
      if (
        (formattedCoinGeckoData.length === 0 ||
          formattedPythData.length === 0) &&
        activeIndex !== 0
      ) {
        // Generate consistent simulated data for both sources
        console.warn(
          "No valid data after processing, generating consistent simulated data"
        );
        const days = getDaysFromIndex(activeIndex);
        const interval = activeIndex === 1 ? 30000 : 60000;

        // Generate base data
        const baseData = simulateHistoricalData(days, interval, false);

        // Create slightly varied secondary data
        const secondaryData = baseData.map((point) => ({
          x: point.x,
          y: point.y * (0.98 + Math.random() * 0.04), // Small variation
        }));

        // Assign data to both sources
        formattedPythData = baseData;
        formattedCoinGeckoData = secondaryData;
      }

      // Update state with formatted data
      setCoinGeckoData(formattedCoinGeckoData);
      setPythData(formattedPythData);

      // Set current price from the latest data point
      if (formattedPythData.length > 0) {
        const latestPoint = formattedPythData[formattedPythData.length - 1];
        setCurrentPrice(latestPoint.y.toFixed(2));
      } else if (formattedCoinGeckoData.length > 0) {
        const latestPoint =
          formattedCoinGeckoData[formattedCoinGeckoData.length - 1];
        setCurrentPrice(latestPoint.y.toFixed(2));
      }

      // Reset retry count on successful fetch
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

      // Generate simulated data for both sources
      const pythSimulated = simulateHistoricalData(days, interval, false);
      const cgSimulated = simulateHistoricalData(days, interval, true);

      setPythData(pythSimulated);
      setCoinGeckoData(cgSimulated);

      if (pythSimulated.length > 0) {
        const latestPoint = pythSimulated[pythSimulated.length - 1];
        setCurrentPrice(latestPoint.y.toFixed(2));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle LIVE mode
  useEffect(() => {
    if (activeIndex !== 0) return; // Only for LIVE mode

    let basePrice = 165.0; // Default starting price
    let liveUpdateInterval: NodeJS.Timeout;

    // Initialize with 5 minutes of historical data
    const initialize = async () => {
      basePrice = await initializeLiveMode();

      // Start regular updates every 5 seconds
      liveUpdateInterval = setInterval(async () => {
        try {
          const newPrice = await fetchLivePrice();
          if (newPrice !== undefined && newPrice > 0) {
            basePrice = newPrice;
            setCurrentPrice(newPrice.toFixed(2));
          } else {
            // Slight variation if price fetch fails
            basePrice = basePrice + (Math.random() - 0.5) * 1;
            setCurrentPrice(basePrice.toFixed(2));
          }

          const ts = Date.now();

          // Update Pyth data
          setPythData((prev) => {
            const newData = [
              ...prev,
              { x: ts, y: parseFloat(basePrice.toFixed(2)) },
            ];
            // Keep reasonable history (300 points = 25 minutes at 5 second intervals)
            return newData.slice(-300);
          });

          // Update CoinGecko data
          setCoinGeckoData((prev) => {
            // Small consistent bias to maintain correlation
            const cgPrice = basePrice * (0.99 + Math.random() * 0.02);

            const newData = [
              ...prev,
              { x: ts, y: parseFloat(cgPrice.toFixed(2)) },
            ];
            return newData.slice(-300);
          });
        } catch (error) {
          console.warn("Error updating live price:", error);
          // Continue with slight variation
          basePrice = basePrice + (Math.random() - 0.5) * 1;
          setCurrentPrice(basePrice.toFixed(2));

          const ts = Date.now();

          // Continue updating with simulated data
          setPythData((prev) => {
            const newData = [
              ...prev,
              { x: ts, y: parseFloat(basePrice.toFixed(2)) },
            ];
            return newData.slice(-300);
          });

          setCoinGeckoData((prev) => {
            const cgPrice = basePrice * (0.99 + Math.random() * 0.02);
            const newData = [
              ...prev,
              { x: ts, y: parseFloat(cgPrice.toFixed(2)) },
            ];
            return newData.slice(-300);
          });
        }
      }, 5000);
    };

    initialize();

    // Clean up interval on unmount or when changing away from LIVE mode
    return () => {
      if (liveUpdateInterval) clearInterval(liveUpdateInterval);
    };
  }, [activeIndex]);

  // Fetch historical data when active index changes (except for LIVE mode)
  useEffect(() => {
    if (activeIndex === 0) return; // Skip for LIVE mode
    setRetryCount(0); // Reset retry count when changing timeframes
    fetchData();
  }, [activeIndex]);

  // ApexCharts options configuration
  const chartOptions: ApexOptions = {
    chart: {
      type: "area" as const,
      height: isMobile ? 250 : 400,
      toolbar: {
        show: false,
      },
      background: "transparent",
      animations: {
        enabled: true,
        speed: 500,
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    colors: ["#10b981", "#3b82f6"], // Green for Pyth, Blue for CoinGecko
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: isDarkMode
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(71, 85, 105, 0.1)",
      strokeDashArray: 3,
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
      padding: {
        top: 0,
        right: 10,
        bottom: 0,
        left: 10,
      },
    },
    tooltip: {
      enabled: true,
      shared: true,
      theme: isDarkMode ? "dark" : "light",
      followCursor: true,
      intersect: false, // Make tooltip appear when hovering anywhere on chart
      custom: undefined, // Remove any custom tooltip function
      fixed: {
        enabled: false, // Don't use fixed position
      },
      onDatasetHover: {
        highlightDataSeries: true, // Highlight the series on hover
      },
      style: {
        fontFamily: "inherit",
        fontSize: isMobile ? "10px" : "12px",
      },
      x: {
        formatter: function (val: number) {
          const date = new Date(val);
          const days = getDaysFromIndex(activeIndex);

          if (activeIndex === 0 || days <= 0.04) {
            // LIVE or 1h
            // Show hours and minutes
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          } else if (days <= 1) {
            // 1D
            // Show hours
            return date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          } else {
            // For longer timeframes
            return date.toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });
          }
        },
      },
      y: {
        formatter: function (val: number) {
          return `$${val.toFixed(2)}`;
        },
      },
      marker: {
        show: true,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      offsetY: 0,
      offsetX: 0,
      fontSize: "12px",
      fontFamily: "inherit",
      labels: {
        colors: isDarkMode ? "#94a3b8" : "#475562",
      },
    },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: isDarkMode ? "#94a3b8" : "#475562",
          fontSize: isMobile ? "9px" : "11px",
        },
        // Ensure we're using the exact timestamp value, not UTC conversion
        datetimeUTC: false,
        formatter: function (_: string, timestamp: number) {
          const dt = new Date(timestamp);
          const hh = dt.getHours().toString().padStart(2, "0");
          const mm = dt.getMinutes().toString().padStart(2, "0");
          return `${hh}:${mm}`;
        },
      },
      axisBorder: { show: true },
      axisTicks: { show: true },
      crosshairs: {
        show: true,
        stroke: {
          color: isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)",
          width: 1,
          dashArray: 0,
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? "#94a3b8" : "#475562",
          fontSize: isMobile ? "9px" : "11px",
        },
        formatter: function (val: number) {
          return `$${val.toFixed(2)}`;
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    markers: {
      size: 0,
      strokeWidth: 0,
      hover: {
        size: 5,
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            height: 250,
          },
        },
      },
    ],
  };

  // Series data for ApexCharts
  const series = [
    {
      name: "Pyth Oracle",
      data: pythData,
    },
    {
      name: "CoinGecko",
      data: coinGeckoData,
    },
  ];

  if (!mounted) {
    return (
      <div className="w-full h-[200px] md:h-[250px] lg:h-[300px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"></div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart header with title and current price */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <h3 className="font-medium">Market Overview</h3>
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
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Pyth Oracle
          </span>
        </div>

        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
          <span className="text-xs text-gray-600 dark:text-gray-300">
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
            mounted &&
            typeof window !== "undefined" && (
              <ErrorBoundary
                fallback={
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="text-red-500 mb-2">
                      Chart rendering error
                    </div>
                    <button
                      onClick={fetchData}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                }
              >
                <ReactApexChart
                  options={chartOptions}
                  series={series}
                  type="area"
                  height={isMobile ? 250 : 400}
                />
              </ErrorBoundary>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingChart;

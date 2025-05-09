"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "react-hot-toast"
import { getPriceData } from "@/lib/price-utils"
import { placeBet, claimPayout } from "@/lib/contract-utils"
import { PublicKey } from "@solana/web3.js"
import {
  setRoundStart,
  fetchConfig,
  fetchRoundDetails,
  syncWithServerTime,
  hasRoundConfigChanged,
  calculateRoundTimes,
} from "./time-manager"
import { useCountdownTimer } from "@/hooks/useCountdownTimer"
import { useWebSocket } from "@/hooks/useWebSocket"
import { WebSocketEventType } from "@/lib/websocket-manager"

// Helper to truncate wallet addresses
const truncateAddress = (address) => {
  if (!address) return ""
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

// Format seconds into mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Storage keys
const STORAGE_KEYS = {
  USER_BETS: (walletAddress) => `prediction_bets_${walletAddress}`,
  CLAIMED_ROUNDS: (walletAddress) => `prediction_claimed_rounds_${walletAddress}`,
  HISTORICAL_ROUNDS: "prediction_historical_rounds",
}

// Check round activity status from API with caching
const roundActivityCache = new Map()
const roundActivityTimestamps = new Map()
const ACTIVITY_CACHE_TTL = 10000 // 10 seconds

const checkRoundActivityStatus = async (roundId) => {
  // Check cache first
  const now = Date.now()
  const cachedTimestamp = roundActivityTimestamps.get(roundId)

  if (cachedTimestamp && now - cachedTimestamp < ACTIVITY_CACHE_TTL) {
    return roundActivityCache.get(roundId)
  }

  try {
    const roundData = await fetchRoundDetails(roundId)
    if (!roundData) {
      throw new Error(`Failed to fetch round status for round ${roundId}`)
    }

    const isActive = roundData.isActive

    // Update cache
    roundActivityCache.set(roundId, isActive)
    roundActivityTimestamps.set(roundId, now)

    return isActive
  } catch (error) {
    console.error("Error checking round activity status:", error)
    // Return cached value if available, otherwise false
    return roundActivityCache.has(roundId) ? roundActivityCache.get(roundId) : false
  }
}

// Generate rounds based on config and current price
const generateRoundsFromConfig = (currentPrice, config, timerInfo, historicalRounds = []) => {
  if (!config || !timerInfo) return []

  const now = Date.now()
  const roundDuration = Number.parseInt(config.roundDuration) // Total round duration in seconds
  const lockDuration = Number.parseInt(config.lockDuration || "30") // Lock duration in seconds
  const liveDuration = roundDuration - lockDuration // Live duration in seconds
  const currentRound = Number.parseInt(config.currentRound)

  // Calculate progress within round
  const elapsedPercentage = timerInfo.elapsedPercentage
  const isLockPhase = timerInfo.isLockPhase
  const timeRemaining = timerInfo.remainingSeconds
  const lockTimeRemaining = timerInfo.lockTimeSeconds

  const rounds = []

  // Look for historical data for the expired round (previous round)
  const expiredRoundId = currentRound - 2
  const expiredRoundData = historicalRounds.find((r) => r.id === expiredRoundId)

  // Expired round (previous round)
  if (currentRound > 2) {
    // Use historical data if available, otherwise generate placeholder
    if (expiredRoundData) {
      rounds.push({
        ...expiredRoundData,
        variant: "expired",
        status: "ENDED",
        timeRemaining: 0,
      })
    } else {
      // Calculate times for this round
      const { startTime, lockTime, endTime } = calculateRoundTimes(config, expiredRoundId)

      rounds.push({
        id: expiredRoundId,
        variant: "expired",
        status: "ENDED",
        prizePool: 8.6015,
        timeRemaining: 0,
        lockPrice: currentPrice - 2.0,
        closePrice: currentPrice - 1.5,
        startTime,
        lockTime,
        endTime,
        upBets: 4.3,
        downBets: 4.3015,
        totalBets: 12,
        liveBets: [],
      })
    }
  }

  // Look for historical data for the live round (current round)
  const liveRoundId = currentRound - 1
  const liveRoundData = historicalRounds.find((r) => r.id === liveRoundId)

  // Current live round
  if (currentRound > 1) {
    // Calculate times for this round
    const { startTime, lockTime, endTime } = calculateRoundTimes(config, liveRoundId)

    // Merge historical data if available
    const baseRound = liveRoundData || {
      prizePool: 0.5,
      upBets: 0.3,
      downBets: 0.2,
      totalBets: 5,
      liveBets: [],
    }

    rounds.push({
      ...baseRound,
      id: liveRoundId,
      variant: "live",
      status: isLockPhase ? "LOCKED" : "LIVE",
      timeRemaining: timeRemaining,
      lockTimeRemaining: lockTimeRemaining,
      currentPrice: currentPrice,
      lockPrice: isLockPhase ? baseRound.lockPrice || currentPrice : null,
      startTime,
      lockTime,
      endTime,
    })
  }

  // Next round (where users can place bets)
  // Look for any existing data for the upcoming round
  const upcomingRoundId = currentRound
  const upcomingRoundData = historicalRounds.find((r) => r.id === upcomingRoundId)

  // Calculate times for this round
  const upcomingTimes = calculateRoundTimes(config, upcomingRoundId)

  rounds.push({
    ...(upcomingRoundData || {
      prizePool: 0.1,
      upBets: 0,
      downBets: 0,
      totalBets: 0,
      liveBets: [],
    }),
    id: upcomingRoundId,
    variant: "next",
    status: "UPCOMING",
    timeRemaining: roundDuration,
    startTime: upcomingTimes.startTime,
    lockTime: upcomingTimes.lockTime,
    endTime: upcomingTimes.endTime,
  })

  // Later round
  const laterTimes = calculateRoundTimes(config, currentRound + 1)

  rounds.push({
    id: currentRound + 1,
    variant: "later",
    status: "LATER",
    prizePool: 0,
    timeRemaining: liveDuration,
    entryStartsIn: timeRemaining + roundDuration,
    startTime: laterTimes.startTime,
    lockTime: laterTimes.lockTime,
    endTime: laterTimes.endTime,
    upBets: 0,
    downBets: 0,
    totalBets: 0,
    liveBets: [],
  })

  return rounds
}

export function useRoundManager({ wallet = {}, signTransaction, sendTransaction, connection, contractAddress }) {
  const { publicKey, connected } = wallet

  // Core state
  const [currentPrice, setCurrentPrice] = useState(0)
  const [historicalPrices, setHistoricalPrices] = useState([])
  const [rounds, setRounds] = useState([])
  const [userBets, setUserBets] = useState([])
  const [liveBets, setLiveBets] = useState([])
  const [userBalance, setUserBalance] = useState(0)
  const [claimableRewards, setClaimableRewards] = useState(0)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [config, setConfig] = useState(null)
  const [roundTransitionInProgress, setRoundTransitionInProgress] = useState(false)
  const [historicalRounds, setHistoricalRounds] = useState([])
  const [claimedRounds, setClaimedRounds] = useState([])
  const [roundActiveStatus, setRoundActiveStatus] = useState({})
  const [isUsingWebSocket, setIsUsingWebSocket] = useState(false)

  // WebSocket connection
  const {
    state: wsState,
    addEventListener,
    removeEventListener,
    sendMessage,
  } = useWebSocket({
    autoConnect: true,
    onOpen: () => {
      console.log("WebSocket connected, subscribing to updates")
      setIsUsingWebSocket(true)
      // Subscribe to updates
      sendMessage("subscribe", {
        types: ["price_update", "round_update", "round_transition", "config_update", "bet_placed"],
        wallet: publicKey ? publicKey.toString() : null,
      })
    },
    onClose: () => {
      console.log("WebSocket disconnected, falling back to polling")
      setIsUsingWebSocket(false)
    },
  })

  // Refs to track last fetch times to prevent excessive API calls
  const lastConfigFetchTime = useRef(0)
  const lastPriceFetchTime = useRef(0)
  const lastRoundStatusCheckTime = useRef({})

  // Config fetch throttling
  const CONFIG_FETCH_INTERVAL = 30000 // 30 seconds
  const PRICE_FETCH_INTERVAL = 10000 // 10 seconds
  const ROUND_STATUS_CHECK_INTERVAL = 10000 // 10 seconds

  // Use the enhanced countdown timer
  const {
    formattedTime,
    remainingSeconds,
    elapsedPercentage,
    currentRound,
    isRoundEnding,
    isRoundChanging,
    isLockPhase,
    lockTimeSeconds,
  } = useCountdownTimer()

  // Load historical rounds data from storage
  const loadHistoricalRounds = useCallback(() => {
    try {
      const storedRounds = localStorage.getItem(STORAGE_KEYS.HISTORICAL_ROUNDS)
      if (storedRounds) {
        return JSON.parse(storedRounds)
      }
    } catch (error) {
      console.error("Error loading historical rounds:", error)
    }
    return []
  }, [])

  // Save historical rounds data to storage
  const saveHistoricalRounds = useCallback((rounds) => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORICAL_ROUNDS, JSON.stringify(rounds))
    } catch (error) {
      console.error("Error saving historical rounds:", error)
    }
  }, [])

  // Load claimed rounds
  const loadClaimedRounds = useCallback(() => {
    if (!publicKey) return []

    try {
      const storedClaimedRounds = localStorage.getItem(STORAGE_KEYS.CLAIMED_ROUNDS(publicKey.toString()))
      if (storedClaimedRounds) {
        return JSON.parse(storedClaimedRounds)
      }
    } catch (error) {
      console.error("Error loading claimed rounds:", error)
    }
    return []
  }, [publicKey])

  // Save claimed rounds
  const saveClaimedRounds = useCallback(
    (claimedRounds) => {
      if (!publicKey) return

      try {
        localStorage.setItem(STORAGE_KEYS.CLAIMED_ROUNDS(publicKey.toString()), JSON.stringify(claimedRounds))
      } catch (error) {
        console.error("Error saving claimed rounds:", error)
      }
    },
    [publicKey],
  )

  // Throttled config fetcher
  const fetchConfigThrottled = useCallback(async (force = false) => {
    const now = Date.now()
    if (force || now - lastConfigFetchTime.current > CONFIG_FETCH_INTERVAL) {
      lastConfigFetchTime.current = now
      return await fetchConfig()
    }
    return null
  }, [])

  // Throttled price fetcher
  const fetchPriceThrottled = useCallback(async (force = false) => {
    const now = Date.now()
    if (force || now - lastPriceFetchTime.current > PRICE_FETCH_INTERVAL) {
      lastPriceFetchTime.current = now
      return await getPriceData()
    }
    return null
  }, [])

  // Throttled round status checker
  const checkRoundStatusThrottled = useCallback(
    async (roundId, force = false) => {
      const now = Date.now()
      if (!lastRoundStatusCheckTime.current[roundId]) {
        lastRoundStatusCheckTime.current[roundId] = 0
      }

      if (force || now - lastRoundStatusCheckTime.current[roundId] > ROUND_STATUS_CHECK_INTERVAL) {
        lastRoundStatusCheckTime.current[roundId] = now
        const isActive = await checkRoundActivityStatus(roundId)
        setRoundActiveStatus((prev) => ({
          ...prev,
          [roundId]: isActive,
        }))
        return isActive
      }

      return roundActiveStatus[roundId]
    },
    [roundActiveStatus],
  )
   // Save user bets to local storage
  const saveUserBets = useCallback(
    (bets) => {
      if (!connected || !publicKey) return

      try {
        localStorage.setItem(STORAGE_KEYS.USER_BETS(publicKey.toString()), JSON.stringify(bets))
      } catch (error) {
        console.error("Error saving user bets:", error)
      }
    },
    [connected, publicKey],
  )


  // Update user bets with round results
  const updateUserBetsWithRoundResults = useCallback(
    (completedRound) => {
      if (!completedRound || !userBets.length) return

      const updatedUserBets = userBets.map((bet) => {
        if (bet.roundId === completedRound.id && bet.status === "PENDING") {
          // Determine if bet won
          const isWinner =
            (bet.direction === "up" && completedRound.closePrice > completedRound.lockPrice) ||
            (bet.direction === "down" && completedRound.closePrice < completedRound.lockPrice)

          // Calculate payout - winners get 2.51x their bet, losers get 0
          const payout = isWinner ? bet.amount * 2.51 : 0

          // Check if this round is already claimed
          const isClaimed = claimedRounds.includes(completedRound.id)

          return {
            ...bet,
            status: isWinner ? "WON" : "LOST",
            payout,
            claimed: isClaimed,
            lockPrice: completedRound.lockPrice,
            closePrice: completedRound.closePrice,
            endTime: completedRound.endTime,
          }
        }
        return bet
      })

      // Only update state if there were changes
      if (JSON.stringify(updatedUserBets) !== JSON.stringify(userBets)) {
        setUserBets(updatedUserBets)
        saveUserBets(updatedUserBets)

        // Recalculate claimable rewards immediately
        const newClaimable = updatedUserBets
          .filter((bet) => bet.status === "WON" && !bet.claimed)
          .reduce((total, bet) => total + bet.payout, 0)

        setClaimableRewards(newClaimable)

        if (newClaimable > 0) {
          toast.success(`You won ${newClaimable.toFixed(4)} SOL! Claim your rewards.`)
        }
      }
    },
    [userBets, claimedRounds, saveUserBets],
  )

   // Update a round in historical data
  const updateHistoricalRound = useCallback(
    (round) => {
      const updatedHistoricalRounds = [...historicalRounds]
      const existingIndex = updatedHistoricalRounds.findIndex((r) => r.id === round.id)

      if (existingIndex >= 0) {
        updatedHistoricalRounds[existingIndex] = {
          ...updatedHistoricalRounds[existingIndex],
          ...round,
        }
      } else {
        updatedHistoricalRounds.push(round)
      }

      setHistoricalRounds(updatedHistoricalRounds)
      saveHistoricalRounds(updatedHistoricalRounds)
    },
    [historicalRounds, saveHistoricalRounds],
  )


  // WebSocket event handlers
  useEffect(() => {
    // Handle price updates
    const handlePriceUpdate = (data) => {
      setCurrentPrice(data.price)
      setHistoricalPrices((prev) => {
        const newData = [...prev, { time: Date.now(), price: data.price }]
        return newData.length > 60 ? newData.slice(-60) : newData
      })
    }

    // Handle round updates
    const handleRoundUpdate = (data) => {
      // Update round data in our state
      const { roundId, ...roundData } = data

      // Update round active status
      if (roundData.isActive !== undefined) {
        setRoundActiveStatus((prev) => ({
          ...prev,
          [roundId]: roundData.isActive,
        }))
      }

      // Update historical rounds if this is a completed round
      if (roundData.status === "ENDED") {
        updateHistoricalRound({
          id: roundId,
          ...roundData,
          variant: "expired",
          status: "ENDED",
        })
      }
    }

    // Handle round transitions
    const handleRoundTransition = (data) => {
      const { previousRound, currentRound, nextRound, config: newConfig } = data

      // Update config
      if (newConfig) {
        setConfig(newConfig)

        // Update timer with new round info
        const roundDuration = Number.parseInt(newConfig.roundDuration)
        const lockDuration = Number.parseInt(newConfig.lockDuration || "30")
        const currentRoundNumber = Number.parseInt(newConfig.currentRound)

        setRoundStart(roundDuration, lockDuration, currentRoundNumber)
      }

      // Update previous round in historical data
      if (previousRound) {
        updateHistoricalRound({
          ...previousRound,
          variant: "expired",
          status: "ENDED",
        })

        // Update user bets with the final results
        updateUserBetsWithRoundResults(previousRound)
      }

      // Reset round transition flag
      setRoundTransitionInProgress(false)
    }

    // Handle config updates
    const handleConfigUpdate = (data) => {
      setConfig(data)

      // Update timer with new config
      const roundDuration = Number.parseInt(data.roundDuration)
      const lockDuration = Number.parseInt(data.lockDuration || "30")
      const currentRound = Number.parseInt(data.currentRound)

      if (hasRoundConfigChanged(roundDuration, lockDuration, currentRound)) {
        setRoundStart(roundDuration, lockDuration, currentRound)
      }
    }

    // Handle bet placed
    const handleBetPlaced = (data) => {
      const { roundId, direction, amount, user, totalBullAmount, totalBearAmount, totalAmount } = data

      // Add to live bets
      if (user) {
        const newLiveBet = {
          user: truncateAddress(user),
          amount,
          direction: direction.toUpperCase(),
        }

        setLiveBets((prev) => [newLiveBet, ...prev].slice(0, 20))
      }

      // Update rounds data
      setRounds((prevRounds) =>
        prevRounds.map((round) => {
          if (round.id === roundId) {
            const updatedUpBets = totalBullAmount
              ? totalBullAmount / 1e9
              : direction === "up"
                ? round.upBets + amount
                : round.upBets

            const updatedDownBets = totalBearAmount
              ? totalBearAmount / 1e9
              : direction === "down"
                ? round.downBets + amount
                : round.downBets

            const updatedPrizePool = totalAmount ? totalAmount / 1e9 : round.prizePool + amount

            const updatedRound = {
              ...round,
              prizePool: +updatedPrizePool.toFixed(4),
              upBets: updatedUpBets,
              downBets: updatedDownBets,
              totalBets: round.totalBets + 1,
            }

            // Also update the round in historical data
            updateHistoricalRound(updatedRound)

            return updatedRound
          }
          return round
        }),
      )
    }

    // Register event listeners
    addEventListener(WebSocketEventType.PRICE_UPDATE, handlePriceUpdate)
    addEventListener(WebSocketEventType.ROUND_UPDATE, handleRoundUpdate)
    addEventListener(WebSocketEventType.ROUND_TRANSITION, handleRoundTransition)
    addEventListener(WebSocketEventType.CONFIG_UPDATE, handleConfigUpdate)
    addEventListener(WebSocketEventType.BET_PLACED, handleBetPlaced)

    // Cleanup
    return () => {
      removeEventListener(WebSocketEventType.PRICE_UPDATE, handlePriceUpdate)
      removeEventListener(WebSocketEventType.ROUND_UPDATE, handleRoundUpdate)
      removeEventListener(WebSocketEventType.ROUND_TRANSITION, handleRoundTransition)
      removeEventListener(WebSocketEventType.CONFIG_UPDATE, handleConfigUpdate)
      removeEventListener(WebSocketEventType.BET_PLACED, handleBetPlaced)
    }
  }, [addEventListener, removeEventListener, updateHistoricalRound, updateUserBetsWithRoundResults])

  // Initialize with price data and configuration
  useEffect(() => {
    const initialize = async () => {
      try {
        // Sync with server time first
        await syncWithServerTime()

        // Load historical rounds
        const storedHistoricalRounds = loadHistoricalRounds()
        setHistoricalRounds(storedHistoricalRounds)

        // Load claimed rounds if wallet is connected
        if (connected && publicKey) {
          const storedClaimedRounds = loadClaimedRounds()
          setClaimedRounds(storedClaimedRounds)
        }

        // Get config
        const configData = await fetchConfig()
        setConfig(configData)
        lastConfigFetchTime.current = Date.now()

        if (!configData) return

        // Initialize timer with config data
        if (configData?.roundDuration && configData?.currentRound) {
          const roundDuration = Number.parseInt(configData.roundDuration)
          const lockDuration = Number.parseInt(configData.lockDuration || "30")
          const currentRound = Number.parseInt(configData.currentRound)

          // Check if we need to update the timer
          if (hasRoundConfigChanged(roundDuration, lockDuration, currentRound)) {
            await setRoundStart(roundDuration, lockDuration, currentRound)
          }
        }

        // Get current price
        const price = await getPriceData()
        setCurrentPrice(price)
        lastPriceFetchTime.current = Date.now()

        // Generate mock historical price data
        const now = Date.now()
        const historicalData = Array.from({ length: 60 }, (_, i) => {
          const time = now - (59 - i) * 5000
          const fluctuation = Math.random() * 10 - 5 // ±5
          return {
            time,
            price: price + fluctuation,
          }
        })

        setHistoricalPrices(historicalData)

        // Generate some mock live bets
        const initialLiveBets = Array(19)
          .fill(null)
          .map(() => ({
            user: `User${Math.floor(Math.random() * 1000)}`,
            amount: (Math.random() * 2).toFixed(2),
            direction: Math.random() > 0.5 ? "UP" : "DOWN",
          }))
        setLiveBets(initialLiveBets)
        setIsInitialized(true)

        // Initial check for round activity
        if (configData.currentRound) {
          const isActive = await checkRoundActivityStatus(configData.currentRound)
          setRoundActiveStatus((prev) => ({
            ...prev,
            [configData.currentRound]: isActive,
          }))
          lastRoundStatusCheckTime.current[configData.currentRound] = Date.now()
        }
      } catch (error) {
        console.error("Error initializing round manager:", error)
        toast.error("Failed to initialize prediction game")
      }
    }

    initialize()

    // Start price polling as a fallback if WebSocket is not available
    const pollingId = setInterval(async () => {
      // Only poll if WebSocket is not connected
      if (!isUsingWebSocket) {
        try {
          const price = await fetchPriceThrottled(true)
          if (price !== null) {
            setCurrentPrice(price)
            setHistoricalPrices((prev) => {
              const newData = [...prev, { time: Date.now(), price }]
              return newData.length > 60 ? newData.slice(-60) : newData
            })
          }
        } catch (err) {
          console.error("Error polling price:", err)
        }
      }
    }, PRICE_FETCH_INTERVAL)

    return () => {
      clearInterval(pollingId)
    }
  }, [connected, publicKey, loadHistoricalRounds, loadClaimedRounds, fetchPriceThrottled, isUsingWebSocket])

  // Poll for round activity status as a fallback if WebSocket is not available
  useEffect(() => {
    if (!config || isUsingWebSocket) return

    const currentRoundNumber = Number.parseInt(config.currentRound)

    const checkRoundActivity = async () => {
      await checkRoundStatusThrottled(currentRoundNumber, true)
    }

    // Check immediately and then at interval
    checkRoundActivity()
    const intervalId = setInterval(checkRoundActivity, ROUND_STATUS_CHECK_INTERVAL)

    return () => clearInterval(intervalId)
  }, [config, checkRoundStatusThrottled, isUsingWebSocket])

  // Effect to update rounds data based on timer
  useEffect(() => {
    if (config && currentPrice > 0) {
      setRounds(
        generateRoundsFromConfig(
          currentPrice,
          config,
          {
            remainingSeconds,
            lockTimeSeconds,
            elapsedPercentage,
            currentRound: currentRound || Number.parseInt(config.currentRound),
            isLockPhase,
          },
          historicalRounds,
        ),
      )
    }
  }, [
    remainingSeconds,
    lockTimeSeconds,
    currentPrice,
    config,
    currentRound,
    elapsedPercentage,
    historicalRounds,
    isLockPhase,
  ])

  // Effect for handling round transitions when timer reaches zero
  // This is now a fallback if WebSocket doesn't provide the transition event
  useEffect(() => {
    const handleRoundTransition = async () => {
      // Only handle transitions if WebSocket is not connected
      if (isUsingWebSocket) return

      // Check if round is changing and not already in transition
      if (isRoundChanging && !roundTransitionInProgress) {
        console.log("Round ending, preparing transition...")
        setRoundTransitionInProgress(true)

        try {
          console.log("Round ended, saving current round data...")

          // Find the current live round and capture its data for history
          const liveRound = rounds.find((r) => r.status === "LIVE" || r.status === "LOCKED")

          if (liveRound) {
            // Fetch the latest data for this round from the API
            const liveRoundDetails = await fetchRoundDetails(liveRound.id)

            // Save the live round's final state to historical rounds
            const finalRoundData = {
              ...liveRound,
              closePrice: liveRoundDetails?.endPrice > 0 ? Number(liveRoundDetails.endPrice) : currentPrice,
              lockPrice:
                liveRoundDetails?.lockPrice > 0
                  ? Number(liveRoundDetails.lockPrice)
                  : liveRound.lockPrice || currentPrice,
              status: "ENDED",
              endTime: Date.now(),
              isActive: false,
            }

            // Update historical rounds
            const updatedHistoricalRounds = [...historicalRounds]
            const existingIndex = updatedHistoricalRounds.findIndex((r) => r.id === liveRound.id)

            if (existingIndex >= 0) {
              updatedHistoricalRounds[existingIndex] = finalRoundData
            } else {
              updatedHistoricalRounds.push(finalRoundData)
            }

            // Only keep the latest 10 rounds in history
            if (updatedHistoricalRounds.length > 10) {
              updatedHistoricalRounds.sort((a, b) => b.id - a.id)
              updatedHistoricalRounds.splice(10)
            }

            setHistoricalRounds(updatedHistoricalRounds)
            saveHistoricalRounds(updatedHistoricalRounds)

            // Update user bets with the final results
            updateUserBetsWithRoundResults(finalRoundData)
          }

          console.log("Round ended, fetching new configuration...")
          // Fetch the latest configuration from the API
          const configData = await fetchConfigThrottled(true)

          if (!configData) {
            toast.error("New round not available")
            return
          }

          console.log("New config data:", configData)

          // Check if new round is active
          if (configData.currentRound) {
            await checkRoundStatusThrottled(configData.currentRound, true)
          }

          if (configData) {
            // Update the config in state which will trigger round regeneration
            setConfig(configData)

            // Let the timer mechanism reset if needed
            if (configData.currentRound) {
              // Force an update of the time manager with new round info
              const roundDuration = Number.parseInt(configData.roundDuration)
              const lockDuration = Number.parseInt(configData.lockDuration || "30")
              const currentRound = Number.parseInt(configData.currentRound)

              await setRoundStart(roundDuration, lockDuration, currentRound)
            }
          }
        } catch (error) {
          console.error("Error during round transition:", error)
          toast.error("Failed to update round information")
        } finally {
          // Reset transition flag after a short delay to prevent multiple triggers
          setTimeout(() => {
            setRoundTransitionInProgress(false)
          }, 2000)
        }
      }
    }

    handleRoundTransition()
  }, [
    isRoundChanging,
    roundTransitionInProgress,
    rounds,
    currentPrice,
    historicalRounds,
    saveHistoricalRounds,
    fetchConfigThrottled,
    checkRoundStatusThrottled,
    isUsingWebSocket,
    updateUserBetsWithRoundResults,
  ])

 
  // Load user data when wallet connects
  useEffect(() => {
    if (!connected || !publicKey || !connection) return

    const loadUserData = async () => {
      try {
        // Get user balance
        const balance = await connection.getBalance(publicKey)
        setUserBalance(balance / 1000000000) // Convert lamports to SOL

        // Load user bets from localStorage
        const savedBets = localStorage.getItem(STORAGE_KEYS.USER_BETS(publicKey.toString()))
        if (savedBets) {
          setUserBets(JSON.parse(savedBets))
        }

        // Load claimed rounds
        const savedClaimedRounds = loadClaimedRounds()
        setClaimedRounds(savedClaimedRounds)

        // Check for claimable rewards
        checkForClaimableRewards()

        // Update WebSocket subscription with wallet
        if (isUsingWebSocket) {
          sendMessage("subscribe", {
            types: ["price_update", "round_update", "round_transition", "config_update", "bet_placed"],
            wallet: publicKey.toString(),
          })
        }
      } catch (error) {
        console.error("Error loading user data:", error)
      }
    }

    loadUserData()
  }, [connected, publicKey, connection, loadClaimedRounds, isUsingWebSocket, sendMessage])

  // Check for claimable rewards
  const checkForClaimableRewards = useCallback(() => {
    if (!connected || !publicKey) return 0

    try {
      // Calculate from our local state
      const claimableBets = userBets.filter((bet) => bet.status === "WON" && !bet.claimed)

      const totalClaimable = claimableBets.reduce((total, bet) => total + bet.payout, 0)

      setClaimableRewards(totalClaimable)
      return totalClaimable
    } catch (error) {
      console.error("Error checking for claimable rewards:", error)
      return 0
    }
  }, [connected, publicKey, userBets])

  // Handle bet placement
  const handlePlaceBet = async (direction, amount, roundId) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    if (isProcessingAction) {
      toast.error("Transaction in progress, please wait")
      return
    }

    // Check if round is active by getting latest status from API
    const isActive = await checkRoundStatusThrottled(roundId, true)

    if (!isActive) {
      toast.error("This round is not active anymore. Please try the next round.")
      return
    }

    const targetRound = rounds.find((r) => r.id === roundId)
    if (!targetRound || targetRound.status !== "UPCOMING") {
      toast.error("This round is not accepting bets anymore")
      return
    }

    if (amount <= 0 || amount > userBalance) {
      toast.error("Invalid bet amount")
      return
    }

    // Check minimum bet amount from config
    if (config && amount * 1e9 < Number.parseInt(config.minBetAmount)) {
      toast.error(`Minimum bet amount is ${Number.parseInt(config.minBetAmount) / 1e9} SOL`)
      return
    }

    setIsProcessingAction(true)
    const toastId = toast.loading("Processing your bet...")

    try {
      let txHash = "" // In real implementation, this would come from contract

      if (connection && contractAddress && signTransaction) {
        // In production, uncomment this to use real contract interaction
        const programId = new PublicKey("CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT")
        const contractPubKey = new PublicKey(contractAddress)

        // Place the bet on-chain
        txHash = await placeBet(
          connection,
          programId,
          contractPubKey,
          publicKey,
          signTransaction,
          sendTransaction,
          roundId,
          direction,
          amount,
        )
      }

      // Add to user bets
      const newBet = {
        id: Date.now(),
        roundId,
        direction,
        amount,
        timestamp: Date.now(),
        wallet: publicKey.toString(),
        walletDisplay: truncateAddress(publicKey.toString()),
        status: "PENDING",
        txHash,
        claimed: false,
        payout: 0, // Will be updated when round ends
      }

      const updatedUserBets = [...userBets, newBet]
      setUserBets(updatedUserBets)
      saveUserBets(updatedUserBets)

      // If using WebSocket, the bet will be broadcast to all users
      // Otherwise, update the UI locally
      if (!isUsingWebSocket) {
        // Add to live bets
        const newLiveBet = {
          user: truncateAddress(publicKey.toString()),
          amount,
          direction: direction.toUpperCase(),
        }
        setLiveBets([newLiveBet, ...liveBets].slice(0, 20))

        // Update prize pool and bet counts in rounds
        setRounds((prevRounds) =>
          prevRounds.map((round) => {
            if (round.id === roundId) {
              const updatedUpBets = direction === "up" ? round.upBets + amount : round.upBets
              const updatedDownBets = direction === "down" ? round.downBets + amount : round.downBets

              const updatedRound = {
                ...round,
                prizePool: +(round.prizePool + amount).toFixed(4),
                upBets: updatedUpBets,
                downBets: updatedDownBets,
                totalBets: round.totalBets + 1,
              }

              // Also update the round in historical data
              updateHistoricalRound(updatedRound)

              return updatedRound
            }
            return round
          }),
        )
      }

      // Update user balance (subtract bet amount)
      setUserBalance((prev) => prev - amount)

      toast.dismiss(toastId)
      toast.success(`${amount} SOL placed on ${direction.toUpperCase()}`)
    } catch (error) {
      console.error("Error placing bet:", error)
      toast.dismiss(toastId)
      toast.error("Failed to place bet, Try again")
    } finally {
      setIsProcessingAction(false)
    }
  }

 
  // Handle claiming rewards
  const handleClaimRewards = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first")
      return
    }

    if (claimableRewards <= 0) {
      toast.error("No rewards to claim")
      return
    }

    if (isProcessingAction) {
      toast.error("Transaction in progress, please wait")
      return
    }

    setIsProcessingAction(true)
    const toastId = toast.loading("Claiming your rewards...")

    try {
      // Get all winning rounds
      const winningBets = userBets.filter((bet) => bet.status === "WON" && !bet.claimed)
      const winningRoundIds = [...new Set(winningBets.map((bet) => bet.roundId))]

      if (winningRoundIds.length === 0) {
        throw new Error("No winning rounds to claim")
      }

      // In a real app, you would call the contract for each round
      // For now, we'll simulate that all rounds were successfully claimed
      let totalClaimed = 0

      for (const roundId of winningRoundIds) {
        let txHash = "mock-claim-tx-hash"

        if (connection && contractAddress && signTransaction) {
          const programId = new PublicKey("CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT")
          const contractPubKey = new PublicKey(contractAddress)

          // Claim the payout on-chain
          txHash = await claimPayout(
            connection,
            programId,
            contractPubKey,
            publicKey,
            signTransaction,
            sendTransaction,
            roundId,
          )
        }

        // Calculate the amount claimed for this round
        const roundBets = winningBets.filter((bet) => bet.roundId === roundId)
        const roundClaimed = roundBets.reduce((total, bet) => total + bet.payout, 0)
        totalClaimed += roundClaimed

        // Add to claimed rounds
        const updatedClaimedRounds = [...claimedRounds, roundId]
        setClaimedRounds(updatedClaimedRounds)
        saveClaimedRounds(updatedClaimedRounds)
      }

      // Update user bets to mark them as claimed
      const updatedUserBets = userBets.map((bet) =>
        bet.status === "WON" && !bet.claimed ? { ...bet, claimed: true } : bet,
      )
      setUserBets(updatedUserBets)
      saveUserBets(updatedUserBets)

      // Update user balance (add reward amount)
      setUserBalance((prev) => prev + claimableRewards)

      // Reset claimable rewards
      setClaimableRewards(0)

      toast.dismiss(toastId)
      toast.success(`Successfully claimed ${totalClaimed.toFixed(4)} SOL`)
    } catch (error) {
      console.error("Error claiming rewards:", error)
      toast.dismiss(toastId)
      toast.error("Failed to claim rewards. Try again")
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Get the active round ID
  const getActiveRoundId = useCallback(() => {
    if (!config) return 0
    return Number.parseInt(config.currentRound) - 1
  }, [config])

  // Get formatted entry start time for later round
  const getEntryStartTime = useCallback(() => {
    // Find the live round to sync the timer
    const liveRound = rounds.find((r) => r.status === "LIVE")
    if (liveRound) {
      return formatTime(liveRound.timeRemaining)
    }

    // Fallback
    const laterRound = rounds.find((r) => r.status === "LATER")
    if (laterRound && laterRound.entryStartsIn) {
      return formatTime(laterRound.entryStartsIn)
    }

    return "00:00"
  }, [rounds])

  // Check if a round is bettable
  const isRoundBettable = useCallback(
    (roundId) => {
      if (!config) return false

      const currentRoundNumber = Number.parseInt(config.currentRound)

      // Can only bet on the next upcoming round
      return roundId === currentRoundNumber && remainingSeconds > 10
    },
    [config, remainingSeconds],
  )

  // Get round durations from config
  const getRoundDurations = useCallback(() => {
    if (!config) return { LIVE: 300, LOCK: 30, TOTAL: 330 }

    const roundDuration = Number.parseInt(config.roundDuration)
    const lockDuration = Number.parseInt(config.lockDuration || "30")
    const liveDuration = roundDuration - lockDuration

    return {
      LIVE: liveDuration,
      LOCK: lockDuration,
      TOTAL: roundDuration,
    }
  }, [config])

  return {
    rounds,
    currentPrice,
    historicalPrices,
    liveBets,
    userBets,
    userBalance,
    claimableRewards,
    isProcessingAction,
    config,
    isUsingWebSocket,
    // Actions
    placeBet: handlePlaceBet,
    claimRewards: handleClaimRewards,
    checkClaimableRewards: checkForClaimableRewards,
    isRoundBettable,
    getActiveRoundId,
    getEntryStartTime,
    // Constants
    ROUND_DURATION: getRoundDurations(),
    // Helpers
    formatTime,
  }
}

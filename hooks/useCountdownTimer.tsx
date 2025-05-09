"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { getRemainingTime, syncWithServerTime } from "../lib/time-manager"

interface CountdownTimerState {
  remainingSeconds: number
  formattedTime: string
  elapsedPercentage: number
  currentRound: number
  isRoundEnding: boolean
  isRoundChanging: boolean
  isLockPhase: boolean
  lockTimeSeconds: number
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}

export const useCountdownTimer = () => {
  const [timerState, setTimerState] = useState<CountdownTimerState>({
    remainingSeconds: 0,
    formattedTime: "0:00",
    elapsedPercentage: 0,
    currentRound: 0,
    isRoundEnding: false,
    isRoundChanging: false,
    isLockPhase: false,
    lockTimeSeconds: 0,
  })
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(Date.now())

  // Function to sync with server periodically
  const syncTime = useCallback(async () => {
    await syncWithServerTime()
    setLastSyncTime(Date.now())
  }, [])

  // Update timer without making network calls
  const updateTimer = useCallback(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current
    lastUpdateRef.current = now

    // Get timer state from local storage (no network call)
    const { remainingSeconds, lockTimeSeconds, roundNumber, elapsedPercentage, isLockPhase } = getRemainingTime()

    // Round is considered ending when less than 10 seconds remain
    const isRoundEnding = remainingSeconds < 10

    // Round is changing when less than 2 seconds remain
    const isRoundChanging = remainingSeconds < 2

    setTimerState({
      remainingSeconds,
      formattedTime: formatTime(remainingSeconds),
      elapsedPercentage,
      currentRound: roundNumber,
      isRoundEnding,
      isRoundChanging,
      isLockPhase,
      lockTimeSeconds,
    })

    // Adjust update frequency based on remaining time
    if (isRoundEnding) {
      // Update more frequently when round is ending (200ms)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(updateTimer, 200)
    } else if (lockTimeSeconds < 10 && lockTimeSeconds > 0) {
      // Update more frequently when approaching lock phase (500ms)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(updateTimer, 500)
    } else {
      // Normal update frequency (1000ms)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(updateTimer, 1000)
    }
  }, [])

  useEffect(() => {
    // Initial sync with server
    syncTime()

    // Set up periodic sync every 5 minutes
    const syncInterval = setInterval(
      () => {
        syncTime()
      },
      5 * 60 * 1000,
    )

    // Initial timer update
    updateTimer()

    return () => {
      clearInterval(syncInterval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [syncTime, updateTimer])

  return timerState
}

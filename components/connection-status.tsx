"use client"

import { useEffect, useState } from "react"
import { WebSocketState } from "@/lib/websocket-manager"
import { useWebSocket } from "@/hooks/useWebSocket"
import { Wifi, WifiOff } from "lucide-react"

export default function ConnectionStatus() {
  const { state } = useWebSocket()
  const [showStatus, setShowStatus] = useState(false)

  // Show status briefly when it changes
  useEffect(() => {
    setShowStatus(true)
    const timer = setTimeout(() => {
      setShowStatus(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [state])

  // Also show status when hovering
  const handleMouseEnter = () => {
    setShowStatus(true)
  }

  const handleMouseLeave = () => {
    setShowStatus(false)
  }

  if (!showStatus) {
    return (
      <div
        className="fixed bottom-4 right-4 p-2 rounded-full bg-gray-800 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
        onMouseEnter={handleMouseEnter}
      >
        {state === WebSocketState.CONNECTED ? (
          <Wifi size={16} className="text-green-500" />
        ) : (
          <WifiOff size={16} className="text-red-500" />
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 p-3 rounded-lg bg-gray-800 shadow-lg flex items-center gap-2 z-50 transition-all"
      onMouseLeave={handleMouseLeave}
    >
      {state === WebSocketState.CONNECTED ? (
        <>
          <Wifi size={16} className="text-green-500" />
          <span className="text-sm text-white">Real-time updates active</span>
        </>
      ) : state === WebSocketState.CONNECTING || state === WebSocketState.RECONNECTING ? (
        <>
          <div className="animate-pulse">
            <Wifi size={16} className="text-yellow-500" />
          </div>
          <span className="text-sm text-white">
            {state === WebSocketState.CONNECTING ? "Connecting..." : "Reconnecting..."}
          </span>
        </>
      ) : (
        <>
          <WifiOff size={16} className="text-red-500" />
          <span className="text-sm text-white">Using fallback polling</span>
        </>
      )}
    </div>
  )
}

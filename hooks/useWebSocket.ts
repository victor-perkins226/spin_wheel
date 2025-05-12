// "use client"

// import { useState, useEffect, useCallback } from "react"
// import WebSocketManager, { WebSocketState, type WebSocketEventType } from "@/lib/websocket-manager"

// interface UseWebSocketOptions {
//   url?: string
//   autoConnect?: boolean
//   onOpen?: () => void
//   onClose?: () => void
//   onError?: (error: any) => void
// }

// interface UseWebSocketResult {
//   state: WebSocketState
//   connect: () => void
//   disconnect: () => void
//   sendMessage: (type: string, data: any) => void
//   addEventListener: (type: WebSocketEventType, listener: (data: any) => void) => void
//   removeEventListener: (type: WebSocketEventType, listener: (data: any) => void) => void
// }

// export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketResult => {
//   const { url = "wss://sol-prediction-backend.onrender.com/ws", autoConnect = true, onOpen, onClose, onError } = options

//   const [wsManager] = useState(() => WebSocketManager.getInstance(url))
//   const [state, setState] = useState<WebSocketState>(wsManager.getState())

//   // Handle state changes
//   useEffect(() => {
//     const handleStateChange = (newState: WebSocketState) => {
//       setState(newState)

//       if (newState === WebSocketState.CONNECTED && onOpen) {
//         onOpen()
//       } else if (newState === WebSocketState.DISCONNECTED && onClose) {
//         onClose()
//       }
//     }

//     wsManager.addStateChangeListener(handleStateChange)

//     return () => {
//       wsManager.removeStateChangeListener(handleStateChange)
//     }
//   }, [wsManager, onOpen, onClose])

//   // Auto-connect if enabled
//   useEffect(() => {
//     if (autoConnect) {
//       wsManager.connect()
//     }

//     return () => {
//       // Don't disconnect on unmount as other components might be using the connection
//       // The WebSocketManager is a singleton and will be shared across components
//     }
//   }, [wsManager, autoConnect])

//   const connect = useCallback(() => {
//     wsManager.connect()
//   }, [wsManager])

//   const disconnect = useCallback(() => {
//     wsManager.disconnect()
//   }, [wsManager])

//   const sendMessage = useCallback(
//     (type: string, data: any) => {
//       wsManager.sendMessage(type, data)
//     },
//     [wsManager],
//   )

//   const addEventListener = useCallback(
//     (type: WebSocketEventType, listener: (data: any) => void) => {
//       wsManager.addEventListener(type, listener)
//     },
//     [wsManager],
//   )

//   const removeEventListener = useCallback(
//     (type: WebSocketEventType, listener: (data: any) => void) => {
//       wsManager.removeEventListener(type, listener)
//     },
//     [wsManager],
//   )

//   return {
//     state,
//     connect,
//     disconnect,
//     sendMessage,
//     addEventListener,
//     removeEventListener,
//   }
// }

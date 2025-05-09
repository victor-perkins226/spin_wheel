// WebSocket connection states
export enum WebSocketState {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
}

// WebSocket event types
export enum WebSocketEventType {
  PRICE_UPDATE = "price_update",
  ROUND_UPDATE = "round_update",
  ROUND_TRANSITION = "round_transition",
  CONFIG_UPDATE = "config_update",
  BET_PLACED = "bet_placed",
  ROUND_RESULT = "round_result",
  ERROR = "error",
}

// WebSocket message interface
export interface WebSocketMessage {
  type: WebSocketEventType
  data: any
}

// WebSocket event listener type
type WebSocketEventListener = (data: any) => void

class WebSocketManager {
  private static instance: WebSocketManager
  private socket: WebSocket | null = null
  private url: string
  private state: WebSocketState = WebSocketState.DISCONNECTED
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 3000 // 3 seconds
  private reconnectTimeoutId: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private eventListeners: Map<WebSocketEventType, Set<WebSocketEventListener>> = new Map()
  private stateChangeListeners: Set<(state: WebSocketState) => void> = new Set()

  private constructor(url: string) {
    this.url = url
  }

  public static getInstance(url = "wss://sol-prediction-backend.onrender.com/ws"): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager(url)
    }
    return WebSocketManager.instance
  }

  public connect(): void {
    if (this.socket && (this.state === WebSocketState.CONNECTED || this.state === WebSocketState.CONNECTING)) {
      console.log("WebSocket already connected or connecting")
      return
    }

    this.updateState(WebSocketState.CONNECTING)

    try {
      this.socket = new WebSocket(this.url)

      this.socket.onopen = this.handleOpen.bind(this)
      this.socket.onmessage = this.handleMessage.bind(this)
      this.socket.onclose = this.handleClose.bind(this)
      this.socket.onerror = this.handleError.bind(this)
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error)
      this.updateState(WebSocketState.DISCONNECTED)
      this.scheduleReconnect()
    }
  }

  public disconnect(): void {
    this.clearHeartbeat()
    this.clearReconnectTimeout()

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    this.updateState(WebSocketState.DISCONNECTED)
  }

  public addEventListener(type: WebSocketEventType, listener: WebSocketEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)?.add(listener)
  }

  public removeEventListener(type: WebSocketEventType, listener: WebSocketEventListener): void {
    if (this.eventListeners.has(type)) {
      this.eventListeners.get(type)?.delete(listener)
    }
  }

  public addStateChangeListener(listener: (state: WebSocketState) => void): void {
    this.stateChangeListeners.add(listener)
  }

  public removeStateChangeListener(listener: (state: WebSocketState) => void): void {
    this.stateChangeListeners.delete(listener)
  }

  public getState(): WebSocketState {
    return this.state
  }

  public sendMessage(type: string, data: any): void {
    if (this.socket && this.state === WebSocketState.CONNECTED) {
      const message = JSON.stringify({ type, data })
      this.socket.send(message)
    } else {
      console.warn("Cannot send message, WebSocket not connected")
    }
  }

  private handleOpen(event: Event): void {
    console.log("WebSocket connection established")
    this.updateState(WebSocketState.CONNECTED)
    this.reconnectAttempts = 0
    this.startHeartbeat()
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      // Handle heartbeat response separately
      if (message.type === "heartbeat") {
        return
      }

      // Dispatch the message to all registered listeners
      if (this.eventListeners.has(message.type)) {
        this.eventListeners.get(message.type)?.forEach((listener) => {
          try {
            listener(message.data)
          } catch (error) {
            console.error(`Error in event listener for ${message.type}:`, error)
          }
        })
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error)
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`)
    this.clearHeartbeat()
    this.updateState(WebSocketState.DISCONNECTED)
    this.scheduleReconnect()
  }

  private handleError(event: Event): void {
    console.error("WebSocket error:", event)
    // The onclose handler will be called after this
  }

  private updateState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState
      this.stateChangeListeners.forEach((listener) => {
        try {
          listener(newState)
        } catch (error) {
          console.error("Error in state change listener:", error)
        }
      })
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Maximum reconnect attempts reached")
      return
    }

    this.clearReconnectTimeout()

    const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts)
    console.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
    )

    this.updateState(WebSocketState.RECONNECTING)
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.clearHeartbeat()

    // Send a heartbeat every 30 seconds to keep the connection alive
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage("heartbeat", { timestamp: Date.now() })
    }, 30000)
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
  }
}

export default WebSocketManager

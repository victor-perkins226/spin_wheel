// hooks/useLivePrice.ts
import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_URL } from './config';


const BACKEND_WS_URL = API_URL; // Default NestJS port

interface LivePriceData {
  price: number | undefined;
  isLoading: boolean; // Renamed from initial loading, now indicates if initial connection is done
  error: string | null;
}

export const useLivePrice = (): LivePriceData => {
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true); // True until first price received
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  function decodePrice(encodedPrice: string): number {
    if (!encodedPrice.startsWith('enc_')) {
      throw new Error('Invalid encoded price format');
    }
    
    const base64Part = encodedPrice.substring(4);
    const buffer = Buffer.from(base64Part, 'base64');
    const decoded = buffer.toString('utf8');
    
    return parseFloat(decoded);
  } 

  useEffect(() => {
    // 1. Initialize WebSocket connection
    console.log("⏳ connecting to WS at", BACKEND_WS_URL);
    socketRef.current = io(`${BACKEND_WS_URL}/price`, { transports: ["websocket"] });
    socketRef.current.on("connect", () =>
      console.log("✅ WS connected!")
    );

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError('Failed to connect to price service.');
      setIsLoading(false); // Stop loading if connection fails
    });

    socketRef.current.on('disconnect', (reason) => {
      setError('Disconnected from price service.');
      setIsLoading(false); // No longer loading if disconnected
    });

    // 2. Listen for 'livePriceUpdate' event from the backend
    socketRef.current.on('dataUpdate', (data: { data: string }) => {
      console.log('Connecting to WebSocket at:', BACKEND_WS_URL);
      if (typeof data.data === 'string') {
        setPrice(decodePrice(data.data));
        setIsLoading(false); // Set to false once the first price is received
        setError(null);
      } else {
        setError('Received invalid price data.');
      }
    });

    // 3. Clean up on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  return { price, isLoading, error };
};

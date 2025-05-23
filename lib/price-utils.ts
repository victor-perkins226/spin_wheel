// hooks/useLivePrice.ts
import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';


const BACKEND_WS_URL ='https://sol-prediction-backend.onrender.com'; // Default NestJS port

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

  useEffect(() => {
    // 1. Initialize WebSocket connection
    socketRef.current = io(BACKEND_WS_URL);

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket backend.');
      setError(null); // Clear any previous errors on reconnect
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError('Failed to connect to price service.');
      setIsLoading(false); // Stop loading if connection fails
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket backend:', reason);
      setError('Disconnected from price service.');
      setIsLoading(false); // No longer loading if disconnected
    });

    // 2. Listen for 'livePriceUpdate' event from the backend
    socketRef.current.on('livePriceUpdate', (data: { price: number }) => {
      if (typeof data.price === 'number') {
        setPrice(data.price);
        setIsLoading(false); // Set to false once the first price is received
        setError(null);
        // console.log('Received live price update:', data.price);
      } else {
        console.warn('Received invalid price update:', data.price);
        setError('Received invalid price data.');
      }
    });

    // 3. Clean up on component unmount
    return () => {
      if (socketRef.current) {
        console.log('Disconnecting from WebSocket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  return { price, isLoading, error };
};
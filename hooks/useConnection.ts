import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { API_URL } from "@/lib/config";
import axios from "axios";

type UseConnectionResult = {
  connection: Connection | null;
  loading: boolean;
  error: string | null;
};

export function useConnection(): UseConnectionResult {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchEndpointAndConnect() {
      setLoading(true);
      setError(null);
      try {
        const {data} = await axios.get(`${API_URL}/rpc/frontend/random`);
        if (!data) throw new Error("Failed to fetch endpoint");
        const conn = new Connection(data, "confirmed");
        if (isMounted) setConnection(conn);
      } catch (err: any) {
        if (isMounted) setError(err.message || "Unknown error");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEndpointAndConnect();

    return () => {
      isMounted = false;
    };
  }, []);

  return { connection, loading, error };
}

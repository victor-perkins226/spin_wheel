// components/WalletContextProvider.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CloverWalletAdapter,
  LedgerWalletAdapter,
  Coin98WalletAdapter,
  TrezorWalletAdapter,
  BitgetWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

import { RPC_URL } from "@/lib/config";
import { useConnection } from "@/hooks/useConnection";

export const network = WalletAdapterNetwork.Devnet;

export const WalletContextProvider = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);

  // mark when we're on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const { connection } = useConnection();
  const endpoint = useMemo(() => connection?.rpcEndpoint || RPC_URL, [connection]);

  const wallets = useMemo(() => {
    // only construct adapters in the browser
    if (!mounted) return [];

    return [
      new PhantomWalletAdapter(),

      // Pass in the network
      new SolflareWalletAdapter({ network }),

      new LedgerWalletAdapter(),
      new CloverWalletAdapter(),
      new Coin98WalletAdapter(),
      new TrustWalletAdapter(),
      new TrezorWalletAdapter({
        manifest: {
          email: process.env.NEXT_PUBLIC_TREZOR_MANIFEST_EMAIL ?? "",
          appUrl: process.env.NEXT_PUBLIC_TREZOR_MANIFEST_APP_URL ?? "",
        },
      }),

      // Bitget needs network as well
      new BitgetWalletAdapter({ network }),
    ];
  }, [mounted]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {/* hide UI until client-side */}
          {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

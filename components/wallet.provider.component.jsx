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
  TorusWalletAdapter,
  TrezorWalletAdapter,
  BitgetWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

import { RPC_URL } from "@/lib/config";

export const network = WalletAdapterNetwork.Devnet;

export const WalletContextProvider = ({
  children,
}) => {
  const [mounted, setMounted] = useState(false);

  // mark when we're on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const endpoint = useMemo(() => RPC_URL, []);

  const wallets = useMemo(() => {
    // only construct adapters in the browser
    if (!mounted) return [];

    return [
      new PhantomWalletAdapter(),

      // Pass in the network
      new SolflareWalletAdapter({ network }),

      new LedgerWalletAdapter(),
      new CloverWalletAdapter(),

      // Torus needs a valid OAuth clientId
      new TorusWalletAdapter({
        options: {
          clientId:"BKhfWCgCPa8DUD068R4lhBuYWzOPRKtaFVTPoE0kTj-BSrFoX7DqnRDFH8ElbDUbNMs4ei2Z4jBz2RdDjtYhS9o",
           network: "devnet",   
        },
      }),

      // Trezor requires a manifest (email + app URL)
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

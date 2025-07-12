// src/context/WalletContextProvider.tsx
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
  TrustWalletAdapter,
  BitgetWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

import { RPC_URL } from "@/lib/config";
import { useConnection } from "@/hooks/useConnection";
export const network = WalletAdapterNetwork.Devnet;

export const WalletContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // mark when we're on the client and detect mobile
  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth <= 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { connection } = useConnection();
  const endpoint = useMemo(
    () => connection?.rpcEndpoint || RPC_URL,
    [connection]
  );

  const wallets = useMemo(() => {
    if (!mounted) return [];

    // --- 1) FORCE the real Phantom provider ---
    let phantomProvider: any;
    const win = window as any;
    if (win.solana) {
      // if window.solana is Phantom
      if (win.solana.isPhantom) {
        phantomProvider = win.solana;
      }
      // otherwise look for it in solana.providers
      else if (Array.isArray(win.solana.providers)) {
        phantomProvider = win.solana.providers.find((p: any) => p.isPhantom);
      }
    }
    const phantomWallet = new PhantomWalletAdapter({ provider: phantomProvider });

    const baseWallets = [
      phantomWallet,
      new SolflareWalletAdapter({ network }),
    ];

    // WalletConnect (optional)
    const walletConnectWallets = [];
    if (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
      walletConnectWallets.push(
        new WalletConnectWalletAdapter({
          network,
          options: {
            relayUrl: "wss://relay.walletconnect.com",
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
            metadata: {
              name: "Fortuva",
              description: "SOL Prediction Platform",
              url: process.env.NEXT_PUBLIC_APP_URL ?? "https://fortuva.com",
              icons: ["https://fortuva.com/favicon.ico"],
            },
          },
        })
      );
    }

    // --- 2) CUSTOMIZE Bitget icon so it's not mistaken for Phantom ---
  
    const desktopWallets = [
      new LedgerWalletAdapter(),
      new CloverWalletAdapter(),
      new Coin98WalletAdapter({ network }),
      new TrustWalletAdapter(),
      new TrezorWalletAdapter(),
      new BitgetWalletAdapter({ network }),
    ];

    if (isMobile) {
      // on mobile, just WalletConnect + mobile-friendly adapters
      return [
        ...walletConnectWallets,
        ...baseWallets,
        new TrustWalletAdapter(),
        new Coin98WalletAdapter({ network }),
      ];
    }

    // on desktop show everything
    return [...baseWallets, ...walletConnectWallets, ...desktopWallets];
  }, [mounted, isMobile]);

  // bubble up errors into our custom event
  const onError = (error: any) => {
    console.error("Wallet provider error:", error);
    setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("wallet-error", { detail: error })
        ),
      0
    );
  };

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true} onError={onError}>
        <WalletModalProvider>
          {mounted ? (
            children
          ) : (
            <div style={{ visibility: "hidden" }}>{children}</div>
          )}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

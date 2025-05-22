"use client"

import React, { Children, FC, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletContextProvider = ({ children }) => {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint =  "https://lb.drpc.org/ogrpc?network=solana-devnet&dkey=AqnRwY5nD0C_uEv_hPfBwlLj0fFzMcQR8JKdzoXPVSjK";

  const wallets = useMemo(
    () => [ new PhantomWalletAdapter()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider> {children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

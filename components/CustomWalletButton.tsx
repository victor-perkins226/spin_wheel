// src/components/EnhancedWalletButton.tsx
import React, { useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton, useWalletModal } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { toast } from "react-hot-toast";
import { useTheme } from "next-themes";

import { ConnectionFailedToast, WalletFailedToast } from "./toasts";

const EnhancedWalletButton: React.FC = () => {
  const { wallet, connecting, connected, select, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { theme } = useTheme();
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastWalletRef = useRef<string | null>(null);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // toast for “wallet not installed”
  const showWalletNotInstalled = useCallback(() => {
    toast.custom(() => <WalletFailedToast theme={theme} />);
  }, [theme]);

  // toast for all other connection failures
  const showConnectionFailed = useCallback(() => {
    toast.custom(() => <ConnectionFailedToast theme={theme} />);
  }, [theme]);

  const forceReset = useCallback(async () => {
    clearConnectionTimeout();
    try {
      await disconnect();
    } catch {}
    setVisible(false);
    setTimeout(() => select(null), 100);
  }, [disconnect, select, clearConnectionTimeout, setVisible]);

  // readiness + timeout
  useEffect(() => {
    if (!wallet) {
      clearConnectionTimeout();
      return;
    }
    const isMobile = window.innerWidth <= 768;
    const name = wallet.adapter.name;

    if (lastWalletRef.current !== name) {
      clearConnectionTimeout();
      lastWalletRef.current = name;
    }

    const checkWallet = () => {
      if (wallet.readyState === WalletReadyState.NotDetected) {
        showWalletNotInstalled();
        setVisible(false);
        forceReset();
        return false;
      }
      if (wallet.readyState === WalletReadyState.Unsupported) {
        showConnectionFailed();
        setVisible(false);
        forceReset();
        return false;
      }
      return true;
    };

    if (!checkWallet()) return;

    if (connecting && !connected) {
      connectionTimeoutRef.current = setTimeout(() => {
        showConnectionFailed();
        forceReset();
      }, 15000);
    }

    return clearConnectionTimeout;
  }, [
    wallet,
    connecting,
    connected,
    clearConnectionTimeout,
    forceReset,
    setVisible,
    showWalletNotInstalled,
    showConnectionFailed,
  ]);

  // on connect
  useEffect(() => {
    if (connected && wallet) {
      clearConnectionTimeout();
    }
  }, [connected, wallet, clearConnectionTimeout]);

  // handle wallet-error events
  useEffect(() => {
    const handler = async (e: any) => {
      const error = e.detail || e;
      clearConnectionTimeout();

      // Bitget “already pending”
      if (
        error.name === "WalletAccountError" &&
        error.message?.includes("already pending")
      ) {
        showConnectionFailed();
        await disconnect().catch(() => {});
        select(null);
        setVisible(false);
        return;
      }

      const msg = (error.message || "").toLowerCase();
      if (
        msg.includes("user rejected") ||
        msg.includes("user declined") ||
        msg.includes("cancelled")
      ) {
        showConnectionFailed();
        await disconnect().catch(() => {});
        select(null);
        setVisible(false);
        return;
      }

      // fallback for other errors
      showConnectionFailed();
      setTimeout(forceReset, 2000);
    };

    window.addEventListener("wallet-error", handler);
    return () => {
      window.removeEventListener("wallet-error", handler);
      clearConnectionTimeout();
    };
  }, [
    disconnect,
    select,
    forceReset,
    clearConnectionTimeout,
    setVisible,
    showConnectionFailed,
  ]);

  // cleanup on unmount
  useEffect(() => clearConnectionTimeout, [clearConnectionTimeout]);

  return (
    <div className="wallet-button-wrapper">
      <WalletMultiButton
        style={{
          backgroundColor: "#7C3AED",
          borderRadius: "8px",
          height: "40px",
          fontSize: "14px",
          fontWeight: 600,
        }}
      />
    </div>
  );
};

export default EnhancedWalletButton;

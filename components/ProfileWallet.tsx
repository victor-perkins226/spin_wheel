// components/ProfileWallet.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import SVG from "./svg.component";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const LABELS = {
  "change-wallet": "Change wallet",
  connecting: "Connecting …",
  "copy-address": "Copy address",
  copied: "Copied",
  disconnect: "Disconnect",
  "has-wallet": "Connect",
  "no-wallet": "Select wallet",
} as const;

export default function ProfileWallet() {
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, []);

  // what label to show on the main button:
  let mainLabel: string;
  if (wallet.connecting) {
    mainLabel = LABELS.connecting;
  } else if (!wallet.connected) {
    // if we have any wallets installed, show “Connect”; otherwise “Select wallet”
    mainLabel = wallet.wallets.length > 0 ? LABELS["has-wallet"] : LABELS["no-wallet"];
  } else if (wallet.publicKey) {
    // once connected, show something like “AbcD…XyZ9”
    const s = wallet.publicKey.toBase58();
    mainLabel = `${s.slice(0, 4)}…${s.slice(-4)}`;
  } else {
    mainLabel = LABELS["no-wallet"];
  }

  // menu actions once connected
  const menuItems = [
    {
      key: "change-wallet",
      label: LABELS["change-wallet"],
      action: () => setVisible(true),
    },
    {
      key: "copy-address",
      label: justCopied ? LABELS.copied : LABELS["copy-address"],
      action: async () => {
        if (wallet.publicKey) {
          await navigator.clipboard.writeText(wallet.publicKey.toBase58());
          setJustCopied(true);
          setTimeout(() => setJustCopied(false), 1500);
        }
      },
    },
    {
      key: "disconnect",
      label: LABELS.disconnect,
      action: () => wallet.disconnect(),
    },
  ];

  // click handler
  const handleClick = () => {
    if (!wallet.connected) {
      setVisible(true);
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={handleClick}
        className="flex items-center flex-col gap-1 space-x-2 px-3 py-1 glass-card rounded-2xl focus:outline-none"
      >
        <SVG iconName="profile" width={30} height={30} />
        <span className=" text-sm">{mainLabel}</span>
      </button>

      {wallet.connected && open && (
        <div className="absolute top-full left-0 mt-2 w-40 glass_test rounded-md shadow-lg z-50">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-white/10 text-white text-sm"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

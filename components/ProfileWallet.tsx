// components/ProfileWallet.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import SVG from "./svg.component";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
const LABELS = {
    'change-wallet': 'Change wallet',
    connecting: 'Connecting ...',
    'copy-address': 'Copy address',
    copied: 'Copied',
    disconnect: 'Disconnect',
    'has-wallet': 'Connect',
    'no-wallet': 'Select Wallet',
} as const;

export default function ProfileWallet() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
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

  // click handler:
  // - if not connected, open the wallet modal immediately
  // - if connected, toggle the dropdown
  const handleClick = () => {
    if (!connected) {
      setVisible(true);
    } else {
      setOpen((o) => !o);
    }
  };

  // only show these when connected
  const menuItems = [
    { key: "change-wallet", label: LABELS["change-wallet"], action: () => setVisible(true) },
    {
      key: "copy-address",
      label: LABELS["copy-address"],
      action: () => publicKey && navigator.clipboard.writeText(publicKey.toBase58()),
    },
    { key: "disconnect", label: LABELS["disconnect"], action: disconnect },
  ];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button onClick={handleClick} className="flex items-center focus:outline-none">
        <SVG iconName="profile" width={35} height={35} />
      </button>

      {/* Dropdown only when connected and toggled open */}
      {connected && open && (
        <div className="absolute top-full left-5 mt-2 w-48 glass rounded-md shadow-lg z-50">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 "
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Show short address below icon when connected */}
      {connected && publicKey && (
        <div className="mt-1 text-xs text-center">
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </div>
      )}
    </div>
  );
}

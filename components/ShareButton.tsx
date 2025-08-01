// components/ShareReferral.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FaShareAlt, FaCopy, FaCheck } from "react-icons/fa";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { useTranslation } from "next-i18next";
import { useTheme } from "next-themes";

function CopiedToast({ theme }: { theme: string | undefined }) {
  return (
    <div
      className={`${
        theme === "dark"
          ? "bg-[#29294d] text-white"
          : "bg-white text-gray-900"
      } px-4 py-2 rounded-lg shadow-lg flex items-center gap-2`}
    >
      <FaCheck className="text-green-500" />
      <span>Link copied!</span>
    </div>
  );
}

export default function ShareReferral() {
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const wallet = useWallet();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refLink, setRefLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!wallet?.publicKey) return;
    const origin = window.location.origin;
    const path = router.asPath.endsWith("/")
      ? router.asPath.slice(0, -1)
      : router.asPath;
    setRefLink(`${origin}${path}/referme/${wallet?.publicKey.toBase58()}`);
  }, [router.asPath]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      toast.custom((t) => <CopiedToast theme={theme} />, {
        position: "top-right",
      });
      // reset icon after a short delay
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <>
    <div className="relative inline-block group">
      <button
        onClick={() => setOpen(true)}
        className="glass py-2 px-6 flex gap-2 items-center rounded-2xl font-semibold justify-center w-[140px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <FaShareAlt /> Share
      </button>

      {/* tooltip */}
      <div
        className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          w-max max-w-xs px-3 py-2 text-sm rounded-lg shadow-lg
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-opacity duration-150 z-[100]
          ${theme === "dark"
            ? "bg-[#29294d] shadow-md border border-[#d1d1d1bb]"
            : "bg-white text-gray-900"}
        `}
      >
        {t("referralTooltip")}
        <span
          className={`absolute top-full left-1/2 transform -translate-x-1/2
            border-4 border-transparent
            ${theme === "dark"
              ? "border-t-gray-800"
              : "border-t-white"
            }`}
        />
      </div>
    </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          <div
            className={`glass relative z-10 max-w-md w-full p-6 rounded-xl
              ${theme === "dark" ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]" : "bg-white"}`}
          >
            <h3 className="text-lg font-semibold mb-4">{t("shareReferral")}</h3>

            <div className="flex mb-4">
              <input
                type="text"
                readOnly
                value={refLink}
                className={` ${theme === "dark" ? "border-gray-200" : "border-black"} flex-1 p-2 rounded-l-full border text-sm bg-transparent`}
              />
              <button
                onClick={copyLink}
                className="glass p-2 rounded-r-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {copied ? (
                  <FaCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <FaCopy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="text-right">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 glass cursor-pointer rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

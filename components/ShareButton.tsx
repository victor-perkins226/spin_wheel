// components/ShareReferral.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { FaShareAlt, FaCopy, FaCheck } from "react-icons/fa";
import { useTheme } from "next-themes";
import toast from "react-hot-toast";

function CopiedToast({ theme }: { theme: string | undefined }) {
  return (
    <div
      className={`
        glass text-left rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="text-sm font-semibold">Copied Successfully</p>
    </div>
  );
}

export default function ShareReferral() {
  const router = useRouter();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [refLink, setRefLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Build referral link on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const path = router.asPath.endsWith("/")
      ? router.asPath.slice(0, -1)
      : router.asPath;
    setRefLink(`${origin}${path}/referme`);
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
      <button
        onClick={() => setOpen(true)}
        className="glass p-4 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <FaShareAlt className="w-6 h-6" />
      </button>

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
            <h3 className="text-lg font-semibold mb-4">Share Referral Link</h3>

            <div className="flex mb-4">
              <input
                type="text"
                readOnly
                value={refLink}
                className="flex-1 p-2 rounded-l-full border border-gray-200 dark:border-gray-700 text-sm bg-transparent"
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
                className="px-4 py-2 glass rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

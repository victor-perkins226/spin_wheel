// components/Referral.tsx
"use client";

import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "next-i18next";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  FaTelegramPlane,
  FaTwitter,
  FaInstagram,
  FaDiscord,
} from "react-icons/fa";
import { SiSolana } from "react-icons/si";
import {
  ReferralToast,
  ReferralToastFailed,
  ReferralToastInputFailed,
} from "./toasts";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { PuffLoader } from "react-spinners";
import { API_URL } from "@/lib/config";

interface ReferralProps {
  onCancel: () => void;
}

export default function Referral({ onCancel }: ReferralProps) {
  const { t } = useTranslation("common");
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toString() ?? "";

  const [selected, setSelected] = useState<
    "telegram" | "twitter" | "instagram" | "discord" | "solscan" | "others"
  >("telegram");
  const [friendSource, setFriendSource] = useState("");
  const [otherSource, setOtherSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const options = [
    { label: "Telegram", value: "telegram", Icon: FaTelegramPlane },
    { label: "Twitter", value: "twitter", Icon: FaTwitter },
    { label: "Instagram", value: "instagram", Icon: FaInstagram },
    { label: "Discord", value: "discord", Icon: FaDiscord },
    { label: "Solscan", value: "solscan", Icon: SiSolana },
    { label: t("referral.others"), value: "others", Icon: null },
  ];

  const { theme } = useTheme();

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Validate friend & others
    if (
      (selected === "others" && !otherSource.trim())
    ) {
      toast.custom((t) => <ReferralToastInputFailed theme={theme} />, {
        position: "top-right",
      });
      return;
    }

    const referralFrom =
         selected === "others"
        ? otherSource.trim()
        : selected;

    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/user/referral`,
        { walletAddress, referralFrom }
      );
      toast.custom((t) => <ReferralToast theme={theme} />, {
        position: "top-right",
      });
      onCancel();
    } catch {
      toast.custom((t) => <ReferralToastFailed theme={theme} />, {
        position: "top-right",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass rounded-3xl max-w-[1300px] mx-auto md:mt-8">
      <div className="max-w-2xl mx-auto p-4 md:p-10 rounded-xl">
        <h2 className="text-lg md:text-3xl pt-8 font-semibold">
          {t("referral.discover")}
        </h2>
        <p className="mt-2 text-sm">{t("referral.curious")}</p>

        <div className="md:mt-6 md:space-y-4 mt-2 space-y-2">
          {options.map(({ label, value, Icon }) => {
            const isSelected = selected === value;
            const base =
              "flex items-center p-2 rounded-lg border transition-colors cursor-pointer";
            const selectedClasses =
              theme === "dark"
                ? "border-white shadow-sm ring-1 ring-transparent bg-white/10"
                : "border-blue-500 ring-1 ring-blue-500 bg-black text-white";
            const unselectedClasses =
              theme === "dark"
                ? "border-transparent hover:bg-gray-200/20 hover:border-gray-600"
                : "border-transparent hover:bg-gray-500/20 hover:border-gray-400";

            return (
              <label
                key={value}
                className={`${base} ${
                  isSelected ? selectedClasses : unselectedClasses
                }`}
                onClick={() => setSelected(value as any)}
              >
                <input
                  type="radio"
                  name="discover"
                  value={value}
                  checked={isSelected}
                  // onChange={() => setSelected(value as any)}
                  className="sr-only"
                />
                {Icon ? (
                  <Icon className="text-xl mr-3" />
                ) : (
                  <span className="text-sm rounded-full mr-3" />
                )}
                <span className="text-sm md:text-lg">{label}</span>

                {/* Inline input for Friend & Others */}
                {(value === "friend" || value === "others") && (
                  <input
                    type="text"
                    placeholder={
                      value === "friend"
                        ? 'Please specify'
                        : 'Please specify if other'
                    }
                    value={otherSource}
                    onChange={(e) => {
                        setOtherSource(e.target.value);
                    }}
                    className={`ml-4 flex-1 p-2 text-sm rounded-2xl placeholder-gray-400 border transition-all focus:outline-none ${
                      !isSelected
                        ?`${theme === "dark"
                          ? "border-gray-200 bg-gray-800 text-white"
                          : "border-gray-700 bg-white text-black"} `
                        : theme === "dark"
                        ? "border-white bg-white/10 text-white"
                        : "border-blue-500 bg-white/90 text-black"
                    }`}
                  />
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-6 text-right space-x-3">
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (selected === "others" && !otherSource.trim())
            }
            className={`px-6 py-3 md:text-base text-xs glass rounded-2xl cursor-pointer font-semibold transition-colors ${
              (selected === "others" && !otherSource.trim())
                ? "opacity-50 cursor-not-allowed"
                : "hover:!bg-gray-100/40"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <PuffLoader size={16} className="animate-spin" />
                Submitting...
              </div>
            ) : (
              <>Submit</>
            )}
          </button>
          <button
          type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 glass cursor-pointer md:text-base text-xs !bg-red-600/70 hover:!bg-red-700/40 text-white rounded-2xl font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

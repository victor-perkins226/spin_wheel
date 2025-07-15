// components/referral.tsx

import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from "next-i18next";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  FaTelegramPlane,
  FaTwitter,
  FaInstagram,
  FaDiscord,
  FaSpinner,
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
    // Validation: if "Others" but no text entered, bail out
    if (selected === "others" && !otherSource.trim()) {
      toast.custom(
        (t) => (
          <>
            <ReferralToastInputFailed theme={theme} />
          </>
        ),
        {
          position: "top-right",
        }
      );
      return;
    }

    const referralFrom = selected === "others" ? otherSource.trim() : selected;
    setIsSubmitting(true);
    try {
      await axios.post(
        "https://sol-prediction-backend-6e3r.onrender.com/user/referral",
        {
          walletAddress,
          referralFrom,
        }
      );
      toast.custom(
        (t) => (
          <>
            <ReferralToast theme={theme} />
          </>
        ),
        {
          position: "top-right",
        }
      );
      onCancel();
    } catch (err) {
      toast.custom(
        (t) => (
          <>
            <ReferralToastFailed theme={theme} />
          </>
        ),
        {
          position: "top-right",
        }
      );
    }
  };

  return (
    <div className="glass rounded-3xl max-w-[1300px] mx-auto md:mt-8">
      <div className="max-w-2xl mx-auto p-4 md:p-10  rounded-xl">
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
              >
                <input
                  type="radio"
                  name="discover"
                  value={value}
                  checked={selected === value}
                  onChange={() => setSelected(value as any)}
                  className="sr-only"
                />
                {Icon ? (
                  <Icon className="text-xl mr-3" />
                ) : (
                  <span className="text-sm rounded-full"></span>
                )}
                <span className="text-sm md:text-lg">{label}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-2 md:mt-4">
          <input
            type="text"
            placeholder={'Please specify if "Others"'}
            value={otherSource}
            onChange={(e) => setOtherSource(e.target.value)}
            disabled={selected !== "others"}
            className={`w-full p-3 text-sm md:text-lg rounded-2xl placeholder-gray-400 border
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
              ${
                selected !== "others"
                  ? "cursor-not-allowed"
                  : theme === "dark"
                  ? "bg-gray-200/10"
                  : "bg-gray-500/10"
              }`}
          />
        </div>

        <div className="mt-2 md:mt-6 text-right space-x-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              (selected === "others" && !otherSource.trim()) || isSubmitting
            }
            className={`px-6 py-3 md:text-base text-xs glass rounded-2xl cursor-pointer font-semibold transition-colors
              ${
                selected === "others" && !otherSource.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:!bg-gray-100/40 "
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

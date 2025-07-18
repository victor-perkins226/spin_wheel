// pages/index.tsx

import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";

import { BANNED_COUNTRY_CODES } from "@/lib/bannedCountries";
import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import Referral from "@/components/referral";
import Lock from "@/public/assets/lock.png";
import { NoInternetToast } from "@/components/toasts";

export const getServerSideProps: GetServerSideProps = async ({
  req,
  locale,
}) => {
  const rawCountry = req.headers["x-vercel-ip-country"] as string | undefined;
  const country = rawCountry ? rawCountry.toUpperCase() : "";
  const isBanned = (BANNED_COUNTRY_CODES as string[]).includes(country);

  return {
    props: {
      isBanned,
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
};

export default function Home({ isBanned }: { isBanned: boolean }) {
  const { theme } = useTheme();
  const { t } = useTranslation("common");
  const { publicKey, connected } = useWallet();

  const [showReferralModal, setShowReferralModal] = useState(false);
  const [checkedReferral, setCheckedReferral] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let alive = true;

    const ping = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        await fetch("https://api.ipify.org?format=json", {
          method: "GET",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (alive) {
          setIsOnline(true);
        }
      } catch (err) {
        if (alive) {
          setIsOnline(false);
        }
      }
    };

    ping();
    const intervalId = setInterval(ping, 10_000);

    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) return;

    const walletAddress = publicKey.toBase58();

    axios
      .get<{ referralFrom?: string }>(
        `https://sol-prediction-backend-6e3r.onrender.com/user/referral/${walletAddress}`
      )
      .then((res) => {
        // If no referralFrom in the response, show the modal
        if (!res.data) {
          setShowReferralModal(true);
        }
      })
      .catch((err) => {
        console.error("Referral lookup failed:", err);
        // In case of error you can choose to show the modal or not:
        setShowReferralModal(true);
      })
      .finally(() => {
        setCheckedReferral(true);
      });
  }, [connected, publicKey]);

  // Restricted-country view
  if (isBanned) {
    return (
      <>
        <Head>
          <title>{t("homeRestrict.title")}</title>
        </Head>
        <main className="flex items-center justify-center">
          <div className="w-full max-w-[600px] h-[500px] pt-12 text-center rounded-2xl flex flex-col items-center justify-center p-4">
            <div className="relative w-full h-full mb-6">
              <Image src={Lock} alt="lock" fill className="object-contain" />
            </div>
            <h3 className="font-bold text-3xl mb-4">
              {t("homeRestrict.heading")}
            </h3>
            <p className="text-lg">{t("homeRestrict.message")}</p>
          </div>
        </main>
      </>
    );
  }

  if (!isOnline) {
    return (
      <>
        <Head>
          <title>No Internet Connection | FORTUVA</title>
        </Head>
        <NoInternetToast theme={theme} />
      </>
    );
  }
  return (
    <>
      <Head>
        <title>Prediction | FORTUVA</title>
      </Head>

      <Hero />
      <PredictionCards />

      {checkedReferral && !showReferralModal && (
        <div
          onClick={() => setShowReferralModal(false)}
          className="fixed inset-0 top-[-3rem] z-50 flex items-center justify-center bg-black/60"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[1000px] mx-4"
          >
            <button
              onClick={() => setShowReferralModal(false)}
              className="absolute top-[1rem] md:top-[3rem] right-5 md:right-10 cursor-pointer z-[100] text-4xl"
            >
              &times;
            </button>
            <Referral onCancel={() => setShowReferralModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}

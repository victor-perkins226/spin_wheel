// pages/index.tsx

import { GetServerSideProps } from "next";
import { BANNED_COUNTRY_CODES } from "@/lib/bannedCountries";
import Head from "next/head";
import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import { useTheme } from "next-themes";

import Lock from "@/public/assets/lock.png";
import Image from "next/image";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  // 1. Read Vercel's country header (ISO-3166-1 alpha-2)
  const rawCountry = req.headers["x-vercel-ip-country"] as string | undefined;
  const country = rawCountry ? rawCountry.toUpperCase() : "";

  console.log("Vercel geo header:", country);

  // 2. If it matches a banned code, mark isBanned = true
  const isBanned = BANNED_COUNTRY_CODES.includes(country);

  return {
    props: { isBanned },
  };
};

export default function Home({ isBanned }: { isBanned: boolean }) {
  const { theme } = useTheme();

  return (
    <>
      {isBanned ? (
        <>
          <Head>
            <title>Access Restricted</title>
          </Head>
          <main className="flex items-center justify-center ">
            <div
              className={`
                w-full max-w-[600px] h-[500px] pt-12  text-center rounded-2xl
                flex flex-col items-center justify-center p-4
              `}
            >
              <div className="relative w-full h-full mb-6">
                <Image
                  src={Lock}
                  alt="lock"
                  fill
                  className="object-contain"
                />
              </div>

              <h3 className="font-bold text-3xl mb-4">
                Access is restricted in your region.
              </h3>

              <p className="text-lg ">
                We can&apos;t provide service in your area because of local rules.
                Please try from another location or check your settings.
              </p>
            </div>
          </main>
        </>
      ) : (
        <>
          <Head>
            <title>Prediction | FORTUVA</title>
          </Head>
          <Hero />
          <PredictionCards />
        </>
      )}
    </>
  );
}

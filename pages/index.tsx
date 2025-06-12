// pages/index.tsx

import { GetServerSideProps } from "next";
import { BANNED_COUNTRY_CODES } from "@/lib/bannedCountries";
import Head from "next/head";
import Hero from "@/components/hero.component";
import PredictionCards from "@/components/prediction-cards.component";
import { useTheme } from "next-themes";

import Lock from "@/public/assets/lock.png";
import Image from "next/image";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export const getServerSideProps: GetServerSideProps = async ({
  req,
  locale,
}) => {
  const rawCountry = req.headers["x-vercel-ip-country"] as string | undefined;
  const country = rawCountry ? rawCountry.toUpperCase() : "";
  const isBanned = BANNED_COUNTRY_CODES.includes(country);

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

  return (
    <>
      {isBanned ? (
        <>
          <Head>
            <title> {t("homeRestrict.title")}</title>
          </Head>
          <main className="flex items-center justify-center ">
            <div
              className={`
                w-full max-w-[600px] h-[500px] pt-12  text-center rounded-2xl
                flex flex-col items-center justify-center p-4
              `}
            >
              <div className="relative w-full h-full mb-6">
                <Image src={Lock} alt="lock" fill className="object-contain" />
              </div>

              <h3 className="font-bold text-3xl mb-4">
                {t("homeRestrict.heading")}
              </h3>

              <p className="text-lg ">{t("homeRestrict.message")}</p>
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

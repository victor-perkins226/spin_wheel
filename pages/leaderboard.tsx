// pages/leaderboard.tsx
import SVG from "@/components/svg.component";
import Head from "next/head";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import axios from "axios";
import { GetServerSideProps } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { formatNum } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { PuffLoader } from "react-spinners";

type Leader = {
  userWalletAddress: string;
  netWinning: number;
  winRate: number;
  roundsWon: number;
  roundsPlayed: number;
};

type Props = {
  leaders: Leader[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export const getServerSideProps: GetServerSideProps<Props> = async ({
  query,
  locale,
}) => {
  const translations = await serverSideTranslations(locale ?? "en", ["common"]);

  const limit = parseInt((query.limit as string) ?? "10", 10);
  const offset = parseInt((query.offset as string) ?? "0", 10);

  let leaders: Leader[] = [];
  let total = 0;
  let hasNext = false;
  let hasPrevious = false;

  try {
    const res = await axios.get(`${API_URL}/leaderboard`, {
      params: { limit, offset },
    });
    const api = res.data;
    leaders = api.data;
    total = api.total;
    hasNext = api.hasNext;
    hasPrevious = api.hasPrevious;
  } catch (e) {
    console.error("SSR fetch failed:", e);
  }

  return {
    props: {
      ...translations,
      leaders,
      total,
      limit,
      offset,
      hasNext,
      hasPrevious,
    },
  };
};

export default function Leaderboard({
  leaders,
  total,
  limit,
  offset,
  hasNext,
  hasPrevious,
}: Props) {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Manage loading spinner on client-side page changes
  useEffect(() => {
    const handleStart = (url: string) => {
      if (url.startsWith("/leaderboard")) setLoading(true);
    };
    const handleComplete = (url: string) => {
      if (url.startsWith("/leaderboard")) setLoading(false);
    };
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);
    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router.events]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handleNext = () => {
    if (hasNext) {
      router.push(
        `/leaderboard?limit=${limit}&offset=${offset + limit}`
      );
    }
  };
  const handlePrev = () => {
    if (hasPrevious) {
      const prevOffset = Math.max(offset - limit, 0);
      router.push(
        `/leaderboard?limit=${limit}&offset=${prevOffset}`
      );
    }
  };

  return (
    <>
      <Head>
        <title>{t("leaderboard.title")} | FORTUVA</title>
      </Head>
      <div className="container mt-[67px]">
        <div className="glass px-[30px] py-[16px] rounded-[20px] w-full overflow-auto relative">
          {/* Loader Overlay */}
          {loading && (
            <div
              className={`absolute inset-0 flex items-center justify-center 
                ${theme === "dark" ? "bg-black/20" : "bg-white/20"} z-10`}
            >
<PuffLoader
                size={30}
                color={theme === "dark" ? "#ffffff" : "#000000"}
                loading={loading}
              />
            </div>
          )}

          {/* Table */}
          <table className="w-full text-left opacity-100">
            <thead className="text-[10px] lg:text-[12px]">
              <tr>
                <th className="pb-[24px] pr-12">{t("leaderboard.user")}</th>
                <th className="pb-[24px] pr-12">
                  {t("leaderboard.winnings")}
                </th>
                <th className="pb-[24px] pr-12">
                  {t("leaderboard.winRate")}
                </th>
                <th className="pb-[24px] pr-12">
                  {t("leaderboard.trades")}
                </th>
                <th className="pb-[24px]">{t("leaderboard.tradesWon")}</th>
              </tr>
            </thead>
            <tbody>
              {leaders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-gray-500"
                  >
                    {t("leaderboard.noData", "No leaders found.")}
                  </td>
                </tr>
              )}
              {leaders.map((L) => {
                const shortAddr = `${L.userWalletAddress.slice(
                  0,
                  6
                )}…${L.userWalletAddress.slice(-4)}`;
                return (
                  <tr
                    key={L.userWalletAddress}
                    className="font-semibold text-[10px] lg:text-[15px]"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex gap-[6px] items-center">
                        <SVG
                          className="hidden lg:block"
                          width={29}
                          height={29}
                          iconName="avatar"
                        />
                        <SVG
                          className="block lg:hidden"
                          width={16}
                          height={16}
                          iconName="avatar"
                        />
                        {shortAddr}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Image
                          className="w-[17px] lg:w-[26px] h-auto object-contain"
                          src={SolanaLogo}
                          alt="SOL"
                        />
                        {formatNum(L.netWinning)} SOL
                      </div>
                    </td>
                    <td className="py-3 pr-4">{formatNum(L.winRate)}%</td>
                    <td className="py-3 pr-4">{L.roundsPlayed}</td>
                    <td className="py-3 pr-4">{L.roundsWon}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm">
              {t("leaderboard.showing")} {offset + 1}-
              {offset + leaders.length} {t("leaderboard.of")} {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!hasPrevious}
                className={`
                  p-2 cursor-pointer rounded-md
                  ${
                    !hasPrevious
                      ? `${theme === "dark" ? "text-gray-600" : "text-gray-400"} cursor-not-allowed`
                      : `${theme === "dark" ? "text-gray-200 hover:bg-gray-900" : "text-gray-700 hover:bg-gray-100"}`
                  }
                `}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-sm">
                {t("leaderboard.page")} {currentPage}{" "}
                {t("leaderboard.of")} {totalPages}
              </div>

              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`
                  p-2 cursor-pointer rounded-md
                  ${
                    !hasNext
                      ? `${theme === "dark" ? "text-gray-600" : "text-gray-400"} cursor-not-allowed`
                      : `${theme === "dark" ? "text-gray-200 hover:bg-gray-900" : "text-gray-700 hover:bg-gray-100"}`
                  }
                `}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

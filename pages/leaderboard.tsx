// pages/leaderboard.tsx
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import SVG from "@/components/svg.component";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import axios from "axios";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { PuffLoader } from "react-spinners";
import { formatNum } from "@/lib/utils";
import { API_URL } from "@/lib/config";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import PositionCard from "@/components/PositionCard";
import SelectBox from "@/components/SelectBox";
import SelectInput from "@/components/SelectInput";

// preload translations only
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
  };
}

type Leader = {
  userWalletAddress: string;
  netWinning: number;
  winRate: number;
  roundsWon: number;
  roundsPlayed: number;
};

const _Leaderboard: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");

  const timeFrames = ["Daily", "Weekly", "Monthly", "Yearly"];
  const rankByOptions = ["Rounds Played", "Net Winnings", "Win Rate"];

  const [timeFrame, setTimeFrame] = useState("Weekly");
  const [rankBy, setRankBy] = useState("Rounds Played");

  useEffect(() => {
    if (!router.isReady) return;
    const qLimit = parseInt(String(router.query.limit), 10);
    const qOffset = parseInt(String(router.query.offset), 10);
    const l = isNaN(qLimit) ? 10 : qLimit;
    const o = isNaN(qOffset) ? 0 : qOffset;
    setLimit(l);
    setOffset(o);

    setLoading(true);
    axios
      .get(`${API_URL}/leaderboard`, { params: { limit: l, offset: o } })
      .then((res) => {
        const { data, total, hasNext, hasPrevious } = res.data;
        setLeaders(data);
        setTotal(total);
        setHasNext(hasNext);
        setHasPrevious(hasPrevious);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.limit, router.query.offset]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const goTo = (newOffset: number) =>
    router.push(`/leaderboard?limit=${limit}&offset=${newOffset}`, undefined, {
      shallow: true,
    });

  return (
    <>
      <Head>
        <title>{t("leaderboard.title")} | FORTUVA</title>
      </Head>
      <div className="container md:mt-[67px] mb-8">
        <div className="flex flex-col gap-6">
          <div className="flex pl-8 w-full gap-6">
            <SelectBox
              label="Time Frame"
              options={timeFrames}
              value={timeFrame}
              onChange={setTimeFrame}
              className="w-1/4"
            />
            <SelectBox
              label="Rank By"
              options={rankByOptions}
              value={rankBy}
              onChange={setRankBy}
              className="w-1/4"
            />
            <SelectInput
              label="Search Address"
              value={searchAddress}
              onChange={setSearchAddress}
              placeholder="Enter wallet address"
              
            />
          </div>

          {/* Top-3 featured cards */}
          <div className="flex flex-wrap my-8 gap-16 justify-center">
            {leaders.slice(0, 3).map((ld, i) => (
              <PositionCard
                key={ld.userWalletAddress}
                position={(i + 1) as 1 | 2 | 3}
                leader={ld}
              />
            ))}
          </div>
        </div>
        <div className="glass px-[30px] py-[16px] rounded-[20px] w-full relative overflow-auto">
          {loading && (
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                theme === "dark" ? "bg-black/20" : "bg-white/20"
              } z-10`}
            >
              <PuffLoader
                size={30}
                color={theme === "dark" ? "#fff" : "#000"}
                loading
              />
            </div>
          )}

          <table className="w-full text-left">
            <thead className="text-[10px] lg:text-[12px]">
              <tr>
                <th className="pb-[24px] pr-12">{t("leaderboard.user")}</th>
                <th className="pb-[24px] pr-12">{t("leaderboard.winnings")}</th>
                <th className="pb-[24px] pr-12">{t("leaderboard.winRate")}</th>
                <th className="pb-[24px] pr-12">{t("leaderboard.trades")}</th>
                <th className="pb-[24px] pr-12">
                  {t("leaderboard.tradesWon")}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaders.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-gray-500"
                  >
                    No Data.
                  </td>
                </tr>
              ) : (
                leaders.map((L) => {
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
                        <div className="flex items-center gap-[6px]">
                          <SVG
                            iconName="avatar"
                            width={29}
                            height={29}
                            className="hidden lg:block"
                          />
                          <SVG
                            iconName="avatar"
                            width={16}
                            height={16}
                            className="block lg:hidden"
                          />
                          {shortAddr}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1">
                          <Image
                            src={SolanaLogo}
                            alt="SOL"
                            className="w-[17px] lg:w-[26px] h-auto object-contain"
                          />
                          {formatNum(L.netWinning)} SOL
                        </div>
                      </td>
                      <td className="py-3 pr-4">{formatNum(L.winRate)}%</td>
                      <td className="py-3 pr-4">{L.roundsPlayed}</td>
                      <td className="py-3 pr-4">{L.roundsWon}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* hide footer while loading */}
          {!loading && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm">
                {t("leaderboard.showing")} {offset + 1}-
                {offset + leaders.length} {t("leaderboard.of")} {total}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goTo(Math.max(offset - limit, 0))}
                  disabled={!hasPrevious}
                  className={`p-2 rounded-md cursor-pointer ${
                    !hasPrevious
                      ? theme === "dark"
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 cursor-not-allowed"
                      : theme === "dark"
                      ? "text-gray-200 hover:bg-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                  `}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm">
                  {t("leaderboard.page")} {currentPage} {t("leaderboard.of")}{" "}
                  {totalPages}
                </div>
                <button
                  onClick={() => goTo(offset + limit)}
                  disabled={!hasNext}
                  className={`p-2 rounded-md cursor-pointer ${
                    !hasNext
                      ? theme === "dark"
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 cursor-not-allowed"
                      : theme === "dark"
                      ? "text-gray-200 hover:bg-gray-900"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                  `}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default dynamic(() => Promise.resolve(_Leaderboard), { ssr: false });

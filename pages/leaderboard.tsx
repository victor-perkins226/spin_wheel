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
import UserStatsModal from "@/components/UserStatsModal";

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

const periodMap: Record<string, string> = {
  All: "all",
  Daily: "daily",
  Weekly: "weekly",
  Monthly: "monthly",
};
const sortByMap: Record<string, string> = {
  "Rounds Played": "roundsPlayed",
  "Net Winnings": "netWinnings",
  "Win Rate": "winRate",
};

// always descending for a leaderboard
const SORT_ORDER = "desc";
const _Leaderboard: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation("common");
  const { theme } = useTheme();

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [topLeaders, setTopLeaders] = useState<Leader[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState("");
  const [selectedDropdown, setSelectedDropdown] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAddress, setModalAddress] = useState("");
  const [modalStats, setModalStats] = useState({
    netWinning: 0,
    winRate: 0,
    roundsWon: 0,
    roundsPlayed: 0,
  });
  const timeFrames = ["All", "Daily", "Weekly", "Monthly"];
  const rankByOptions = ["Rounds Played", "Net Winnings", "Win Rate"];

  const [timeFrame, setTimeFrame] = useState("All");
  const [rankBy, setRankBy] = useState("Rounds Played");

  const [tableOffset, setTableOffset] = useState(0);
  const TOP_N = 3;
  useEffect(() => {
    if (!router.isReady) return;
    setLoading(true);

    const p = periodMap[timeFrame]; // now only "all","daily","weekly","monthly"
    const sb = sortByMap[rankBy];
    const so = SORT_ORDER;
    const addrParam = searchAddress || undefined;
    // const tableOffset = offset + TOP_N;

    const top3Req = axios.get(`${API_URL}/leaderboard`, {
      params: {
        period: p,
        sortBy: sb,
        sortOrder: so,
        limit: TOP_N,
        offset: 0,
        address: addrParam,
      },
    });
    const to = offset + TOP_N;
    const pageReq = axios.get(`${API_URL}/leaderboard`, {
      params: {
        period: p,
        sortBy: sb,
        sortOrder: so,
        limit,
        offset: to,
        address: addrParam,
      },
    });

    Promise.all([top3Req, pageReq])
      .then(([t3, page]) => {
        // helper to detect if the API gave back only null metrics
        const hasRealData = (arr: any[]) =>
          arr.some((item) => item.netWinning !== null);

        const rawTop3 = t3.data.data as Leader[];
        const rawPage = page.data.data as Leader[];
        setTableOffset(to);
        setTopLeaders(hasRealData(rawTop3) ? rawTop3 : []);
        setLeaders(hasRealData(rawPage) ? rawPage : []);

        // only show total/next/prev if there was real data
        if (hasRealData(rawPage)) {
          setTotal(page.data.total);
          setHasNext(page.data.hasNext);
          setHasPrevious(page.data.hasPrevious);
        } else {
          setTotal(0);
          setHasNext(false);
          setHasPrevious(false);
        }
      })
      .catch((err) => {
        console.error(err);
        // if the server still chucks a 400 for period or anything else,
        // just treat it like “no data”
        setTopLeaders([]);
        setLeaders([]);
        setTotal(0);
        setHasNext(false);
        setHasPrevious(false);
      })
      .finally(() => setLoading(false));
  }, [router.isReady, limit, offset, timeFrame, rankBy, searchAddress]);

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Head>
        <title>{t("leaderboard.title")} | FORTUVA</title>
      </Head>
      <div className="container md:mt-[67px] mb-8">
        <div className="flex flex-col gap-6">
          <div className="flex md:flex-row flex-col md:pl-3  pt-3 w-full gap-6">
            <SelectBox
              label="Time Frame"
              options={timeFrames}
              value={timeFrame}
              onChange={setTimeFrame}
              className="md:w-1/4"
            />
            <SelectBox
              label="Rank By"
              options={rankByOptions}
              value={rankBy}
              onChange={setRankBy}
              className="md:w-1/4"
            />
            <SelectInput
              label="Search Address"
              value={searchAddress}
              onChange={setSearchAddress}
              placeholder="Enter wallet address"
              className="md:w-1/4 w-full"
            />
          </div>

          {/* Top-3 featured cards */}
          <div className="flex flex-wrap my-8 gap-16 justify-between">
            {topLeaders.map((ld, i) => (
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
                <th className="pb-[24px] pr-12">#</th>
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
                    colSpan={6}
                    className="py-6 text-center text-sm text-gray-500"
                  >
                    No Data.
                  </td>
                </tr>
              ) : (
                leaders.map((L, i) => {
                  const rank = tableOffset + i + 1;
                  const shortAddr = `${L.userWalletAddress.slice(
                    0,
                    6
                  )}…${L.userWalletAddress.slice(-4)}`;
                  return (
                    <tr
                      key={L.userWalletAddress}
                      className="font-semibold text-[10px] lg:text-[15px]"
                    >
                      <td className="py-3 pr-4">{rank}</td>

                      <td className="py-3 pr-4">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setSelectedDropdown((prev) =>
                                prev === L.userWalletAddress
                                  ? null
                                  : L.userWalletAddress
                              )
                            }
                            className="flex items-center gap-[6px] font-semibold  cursor-pointer"
                          >
                            <SVG iconName="avatar" width={16} height={16} />
                            {shortAddr}
                          </button>

                          {selectedDropdown === L.userWalletAddress && (
                            <div
                              className={`
      absolute left-0 top-full mt-2 w-40 rounded-md shadow-lg z-20
      ${theme === "dark" ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]" : "bg-white"}
      border border-gray-200 dark:border-gray-700
    `}
                            >
                              <button
                                onClick={() => {
                                  setModalAddress(L.userWalletAddress);
                                  setModalStats({
                                    netWinning: L.netWinning,
                                    winRate: L.winRate,
                                    roundsWon: L.roundsWon,
                                    roundsPlayed: L.roundsPlayed,
                                  });
                                  setModalOpen(true);
                                  setSelectedDropdown(null);
                                }}
                                className={`
        block w-full text-left px-4 py-2 text-sm cursor-pointer
        ${theme === "dark" ? "hover:bg-white/50" : "hover:bg-gray-300"}
      `}
                              >
                                View Stats
                              </button>
                              <button
                                onClick={() =>
                                  window.open(
                                    `https://solscan.io/account/${L.userWalletAddress}`,
                                    "_blank"
                                  )
                                }
                                className={`
         w-full text-left px-4 py-2 text-sm cursor-pointer
            ${theme === "dark" ? "hover:bg-white/50" : "hover:bg-gray-300"}
      `}
                              >
                                View on Explorer
                              </button>
                            </div>
                          )}
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
                      <td className="py-3 pr-4">{formatNum(L.winRate * 100)}%</td>
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
                {t("leaderboard.showing")} {tableOffset + 1}-
                {tableOffset + leaders.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset(Math.max(offset - limit, 0))}
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
                  onClick={() => setOffset(offset + limit)}
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
      <UserStatsModal
        isOpen={modalOpen}
        address={modalAddress}
        stats={modalStats}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default dynamic(() => Promise.resolve(_Leaderboard), { ssr: false });

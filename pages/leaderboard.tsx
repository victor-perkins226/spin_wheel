import dynamic from "next/dynamic";
import React, { useEffect, useRef, useState } from "react";
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
import { network } from "@/components/wallet.provider.component";

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
const SORT_ORDER = "desc";

const Leaderboard: React.FC = () => {
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

  // local filter state
  const [inputAddress, setInputAddress] = useState("");

  const [selectedDropdown, setSelectedDropdown] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAddress, setModalAddress] = useState("");
  const [modalStats, setModalStats] = useState({
    netWinning: 0,
    winRate: 0,
    roundsWon: 0,
    roundsPlayed: 0,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setSelectedDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const timeFrames = ["All", "Daily", "Weekly", "Monthly"];
  const rankByOptions = ["Rounds Played", "Net Winnings", "Win Rate"];
  const [timeFrame, setTimeFrame] = useState("All");
  const [rankBy, setRankBy] = useState("Rounds Played");
  const [tableOffset, setTableOffset] = useState(0);
  const TOP_N = 3;

  // fetch leaderboard data once
  useEffect(() => {
    if (!router.isReady) return;
    setLoading(true);
    const p = periodMap[timeFrame];
    const sb = sortByMap[rankBy];
    const so = SORT_ORDER;
    axios
      .all([
        axios.get(`${API_URL}/leaderboard`, {
          params: {
            period: p,
            sortBy: sb,
            sortOrder: so,
            limit: TOP_N,
            offset: 0,
          },
        }),
        axios.get(`${API_URL}/leaderboard`, {
          params: {
            period: p,
            sortBy: sb,
            sortOrder: so,
            limit,
            offset: offset + TOP_N,
          },
        }),
      ])
      .then(([topRes, pageRes]) => {
        const rawTop = topRes.data.data as Leader[];
        const rawPage = pageRes.data.data as Leader[];
        const hasReal = (arr: Leader[]) =>
          arr.some((x) => x.netWinning != null);
        setTopLeaders(hasReal(rawTop) ? rawTop : []);
        setLeaders(hasReal(rawPage) ? rawPage : []);
        if (hasReal(rawPage)) {
          setTotal(pageRes.data.total);
          setHasNext(pageRes.data.hasNext);
          setHasPrevious(pageRes.data.hasPrevious);
        } else {
          setTotal(0);
          setHasNext(false);
          setHasPrevious(false);
        }
        setTableOffset(offset + TOP_N);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router.isReady, limit, offset, timeFrame, rankBy]);

  // apply local filter
  const filtered = inputAddress
    ? leaders.filter((l) => l.userWalletAddress.includes(inputAddress))
    : leaders;

  const suggestions = inputAddress
    ? leaders.filter((l) =>
        l.userWalletAddress.toLowerCase().includes(inputAddress.toLowerCase())
      )
    : [];

  // footer indices
  const startIndex = inputAddress ? 1 : tableOffset + 1;
  const endIndex = inputAddress
    ? filtered.length
    : tableOffset + filtered.length;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <Head>
        <title>{t("leaderboard.title")} | FORTUVA</title>
      </Head>
      <div className="container md:mt-[67px] mb-8">
        <div className="flex flex-col  gap-6">
          <div className="flex md:flex-row justify-center flex-col pt-3 w-full gap-6">
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
            <div className="relative w-full max-w-[340px] md:w-1/4">
              <SelectInput
                label="Search Address"
                value={inputAddress}
                onChange={(val) => {
                  setInputAddress(val);
                  setSelectedDropdown(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && suggestions.length > 0) {
                    const first = suggestions[0];
                    setModalAddress(first.userWalletAddress);
                    setModalStats(first);
                    setModalOpen(true);
                    setInputAddress("");
                  }
                }}
                placeholder="Enter wallet address"
              />
              {inputAddress && suggestions.length > 0 /* ← added */ && (
                <ul
                  className={`absolute left-0 mt-2 p-2 glass border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[100] ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
                      : "bg-white"
                  }`}
                >
                  {suggestions.map((s, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => {
                          setModalAddress(s.userWalletAddress);
                          setModalStats(s);
                          setModalOpen(true);
                          setInputAddress("");
                        }}
                        className="w-full text-left text-sm px-4 py-2 hover:bg-gray-400 rounded-md "
                      >
                        {/* {`${s.userWalletAddress.slice(
                          0,
                          9
                        )}…${s.userWalletAddress.slice(-4)}`} */}
                        {s.userWalletAddress}
                      </button>
                    </li>
                  ))}
                </ul>
              )}{" "}
              {/* ← added */}
            </div>
          </div>
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-sm text-gray-500"
                  >
                    No matching addresses.
                  </td>
                </tr>
              ) : (
                filtered.map((L, i) => {
                  const rank = startIndex + i;
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
                      <td>
                        <div
                          ref={dropdownRef}
                          className="relative inline-block"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              setSelectedDropdown((prev) =>
                                prev === L.userWalletAddress
                                  ? null
                                  : L.userWalletAddress
                              )
                            }
                            className="flex items-center gap-1 cursor-pointer"
                          >
                            <SVG iconName="avatar" />
                            <span className="ml-1">{`${L.userWalletAddress.slice(
                              0,
                              6
                            )}…${L.userWalletAddress.slice(-4)}`}</span>
                          </button>
                          {selectedDropdown === L.userWalletAddress && (
                            <div
                              className={`
           absolute left-0 top-full mt-2 w-42 rounded-md shadow-lg z-20 p-1
      ${
        theme === "dark"
          ? "bg-gradient-to-r from-[#2a2a4c] to-[#2a2a4c]"
          : "bg-white"
      }
      border border-gray-200 dark:border-gray-700
   r
          `}
                            >
                              <button
                                onClick={() => {
                                  setModalAddress(L.userWalletAddress);
                                  setModalStats(L);
                                  setModalOpen(true);
                                  setSelectedDropdown(null);
                                }}
                                className={`
        block w-full text-left px-4 py-2 text-sm cursor-pointer rounded-md
        ${theme === "dark" ? "hover:bg-white/50" : "hover:bg-gray-300"}`}
                              >
                                View Stats
                              </button>
                              <button
                                onClick={() => {
                                  window.open(
                                    `https://solscan.io/account/${L.userWalletAddress}?cluster=${network}`,
                                    "_blank"
                                  );
                                  setSelectedDropdown(null);
                                }}
                                className={`
        block w-full text-left px-4 py-2 text-sm cursor-pointer rounded-md
        ${theme === "dark" ? "hover:bg-white/50" : "hover:bg-gray-300"}`}
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
                            className="w-[17px] h-auto inline-block"
                          />
                          {formatNum(L.netWinning)} SOL
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {formatNum(L.winRate * 100)}%
                      </td>
                      <td className="py-3 pr-4">{L.roundsPlayed}</td>
                      <td className="py-3 pr-4">{L.roundsWon}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!loading && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm">
                {t("leaderboard.showing")} {startIndex}-
                {startIndex + filtered.length - 1}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOffset(Math.max(offset - limit, 0))}
                  disabled={!hasPrevious}
                  className="p-2 rounded-md cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm">
                  {t("leaderboard.page")} {currentPage} {t("leaderboard.of")}{" "}
                  {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setOffset(offset + limit)}
                  disabled={!hasNext}
                  className="p-2 rounded-md cursor-pointer disabled:opacity-50"
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

export default dynamic(() => Promise.resolve(Leaderboard), { ssr: false });

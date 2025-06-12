// pages/leaderboard.tsx
import SVG from "@/components/svg.component";
import Head from "next/head";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import axios from "axios";
import { GetStaticProps } from "next";
import { ThemeToggle } from "@/components/Themetoggle";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import { formatNum } from "@/lib/utils";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

type Leader = {
  userWalletAddress: string;
  netWinning: number;
  winRate: number;
  roundsWon: number;
  roundsPlayed: number;
};

type Props = { leaders: Leader[] };

export const getStaticProps: GetStaticProps<Props> = async ({locale}) => {
  try {
    const { data: leaders } = await axios.get<Leader[]>(
      `${API_URL}/leaderboard`
    );
    return {
      props: { leaders,
         ...(await serverSideTranslations(locale ?? 'en', ['common'])),
       },

      revalidate: 60,
    };
  } catch (err) {
    console.error("Leaderboard fetch failed:", err);
    return { props: { leaders: [],
       ...(await serverSideTranslations(locale ?? 'en', ['common'])),
     }, revalidate: 60 };
  }
};

export default function Leaderboard({ leaders }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const leadersPerPage = 10;

  // Reset to first page if leaders update
  useEffect(() => {
    setCurrentPage(1);
  }, [leaders]);

  const indexOfLastLeader = currentPage * leadersPerPage;
  const indexOfFirstLeader = indexOfLastLeader - leadersPerPage;
  const currentLeaders = leaders.slice(indexOfFirstLeader, indexOfLastLeader);
  const totalPages = Math.ceil(leaders.length / leadersPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <title>{t('leaderboard.title')} | FORTUVA</title>
      </Head>
      <div className="container mt-[67px]">
        {/* <div className="flex items-center justify-end mb-[30px]">
          <ThemeToggle/>
        </div> */}
        <div className="glass px-[30px] py-[16px] rounded-[20px] w-full overflow-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] lg:text-[12px]">
              <tr>
                <th className="pb-[24px] pr-12">{t('leaderboard.user')}</th>
                <th className="pb-[24px] pr-12">{t('leaderboard.winnings')}</th>
                <th className="pb-[24px] pr-12">{t('leaderboard.winRate')}</th>
                <th className="pb-[24px] pr-12">{t('leaderboard.trades')}</th>
                <th className="pb-[24px]">{t('leaderboard.tradesWon')}</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((L) => {
                const shortAddr = `${L.userWalletAddress.slice(
                  0,
                  6
                )}…${L.userWalletAddress.slice(-4)}`;
                const pct = `${formatNum(L.winRate)}%`;
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
                    <td className="py-3 pr-4">{pct}</td>
                    <td className="py-3 pr-4">{L.roundsPlayed}</td>
                    <td className="py-3 pr-4">{L.roundsWon}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm ">
              {t('leaderboard.showing')} {indexOfFirstLeader + 1}-{Math.min(indexOfLastLeader, leaders.length)} of {leaders.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 hover:bg-gray-100'}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm ">
                {t('leaderboard.page')} {currentPage} {t('leaderboard.of')} {totalPages}
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 hover:bg-gray-100'}`}
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

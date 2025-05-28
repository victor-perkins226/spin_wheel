// pages/leaderboard.tsx
import SVG from "@/components/svg.component";
import Head from "next/head";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";
import axios from "axios";
import { GetStaticProps } from "next";

type Leader = {
  userWalletAddress: string;
  netWinning: number;
  winRate: number;
  roundsWon: number;
  roundsPlayed: number;
};

type Props = { leaders: Leader[] };

export const getStaticProps: GetStaticProps<Props> = async () => {
  try {
    const { data: leaders } = await axios.get<Leader[]>(
      "https://sol-prediction-backend.onrender.com/leaderboard"
    );
    return {
      props: { leaders },
      // Re-build this page in the background at most once per minute:
      revalidate: 60,
    };
  } catch (err) {
    console.error("Leaderboard fetch failed:", err);
    return { props: { leaders: [] }, revalidate: 60 };
  }
};

export default function Leaderboard({ leaders }: Props) {
  return (
    <>
      <Head>
        <title>Leaderboard | FORTUVA</title>
      </Head>
      <div className="container mt-[67px]">
        <div className="glass px-[30px] py-[16px] rounded-[20px] w-full overflow-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] lg:text-[12px]">
              <tr>
                <th className="pb-[24px] pr-12">User</th>
                <th className="pb-[24px] pr-12">Winnings</th>
                <th className="pb-[24px] pr-12">Win Rate</th>
                <th className="pb-[24px] pr-12">Trades Entered</th>
                <th className="pb-[24px]">Trades Won</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((L) => {
                const shortAddr = `${L.userWalletAddress.slice(
                  0,
                  6
                )}…${L.userWalletAddress.slice(-4)}`;
                const pct = `${L.winRate.toFixed(2)}%`;
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
                        {L.netWinning.toFixed(3)} SOL
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
        </div>
      </div>
    </>
  );
}

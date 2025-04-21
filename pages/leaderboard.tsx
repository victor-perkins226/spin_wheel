import SVG from "@/components/svg.component";
import Head from "next/head";
import Image from "next/image";
import SolanaLogo from "@/public/assets/solana_logo.png";

export default function Leaderboard() {
  return (
    <>
      <Head>
        <title>Leaderboard | FORTUVA</title>
      </Head>

      <div className="container mt-[67px]">
        <div className="glass px-[30px] py-[16px] rounded-[20px] w-full flex overflow-auto">
          <table className="w-full text-left">
            <thead className="mb-[25px] text-[10px] text-nowrap">
              <tr className="mb-[25px]">
                <th className="pb-[24px] pr-12">User</th>
                <th className="pb-[24px] pr-12">Winnings</th>
                <th className="pb-[24px] pr-12">Win Rate</th>
                <th className="pb-[24px] pr-12">Trades Entered</th>
                <th className="pb-[24px]">Trades Won</th>
              </tr>
            </thead>

            <tbody>
              {[
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
                19, 20,
              ].map((el, key) => (
                <tr
                  key={key}
                  className="font-semibold text-[10px] lg:text-[15px] text-nowrap"
                >
                  <td className="py-3 pr-4">
                    <div className="flex gap-[6px] items-center">
                      {" "}
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
                      John Doe
                    </div>
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <Image
                        className="w-[17px] lg:w-[26px] h-auto object-contain"
                        src={SolanaLogo}
                        alt=""
                      />
                      0.1 SOL
                    </div>
                  </td>

                  <td className="py-3 pr-4">58%</td>

                  <td className="py-3 pr-4">120</td>

                  <td className="py-3 pr-4">67</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

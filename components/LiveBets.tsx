import Image from "next/image";
import React from "react";
import SVG from "./svg.component";

function LiveBets({ liveBets }) {
  return (
    <div className="hidden xl:flex col-span-3 flex-col gap-[53px] items-end">
      <div
        className="glass py-[15px] px-[24px] rounded-[20px] font-semibold text-[20px] cursor-pointer"
        onClick={() => (window.location.href = "/leaderboard")}
      >
        Leaderboard
      </div>
      <div className="glass px-[30px] py-[16px] rounded-[20px] w-full">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-[24px]">User</th>
              <th className="pb-[24px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {liveBets.map((bet, key) => (
              <tr key={key} className="font-semibold text-[15px]">
                <td className="py-3">
                  <div className="flex gap-[6px] items-center">
                    <SVG width={29} height={29} iconName="avatar" />
                    {bet.user}
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <Image
                      className="w-[30px] h-auto object-contain"
                      src="/assets/solana_logo.png"
                      alt="Solana"
                      width={30}
                      height={30}
                    />
                    {bet.amount} SOL
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LiveBets;

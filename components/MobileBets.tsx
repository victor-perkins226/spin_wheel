import Image from "next/image";
import SVG from "./svg.component";

export const MobileLiveBets = ({ liveBets }) => {
  return (
    <div className="w-full glass px-3 py-4 rounded-lg mt-2">
      <h3 className="font-semibold text-base mb-3">Live Bets</h3>
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-2 text-xs">User</th>
              <th className="pb-2 text-xs">Amount</th>
              <th className="pb-2 text-xs">Position</th>
            </tr>
          </thead>
          <tbody>
            {liveBets.map((bet, key) => (
              <tr key={key} className="font-semibold text-xs">
                <td className="py-2">
                  <div className="flex gap-1 items-center">
                    <SVG width={20} height={20} iconName="avatar" />
                    {bet.user}
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1">
                    <Image
                      className="w-[20px] h-auto object-contain"
                      src="/assets/solana_logo.png"
                      alt="Solana"
                      width={20}
                      height={20}
                    />
                    {bet.amount} SOL
                  </div>
                </td>
                <td
                  className={`py-2 ${
                    bet.direction === "UP" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {bet.direction}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
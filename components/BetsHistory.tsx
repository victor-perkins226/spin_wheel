import React from "react";

export function BetsHistory({ userBets }) {
  return (
    <div>
      <div className="glass p-4 rounded-xl">
        <h2 className="text-lg font-semibold mb-4">Your Predictions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm">
                <th className="pb-2">Round</th>
                <th className="pb-2">Prediction</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Payout</th>
              </tr>
            </thead>
            <tbody>
              {userBets.map((bet) => (
                <tr key={bet.id} className="border-t border-gray-700">
                  <td className="py-3">#{bet.roundId}</td>
                  <td
                    className={`py-3 ${
                      bet.direction === "up" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {bet.direction.toUpperCase()}
                  </td>
                  <td className="py-3">{bet.amount} SOL</td>
                  <td className="py-3">
                    <span
                      className={`
                            ${bet.status === "PENDING" ? "text-yellow-500" : ""}
                            ${bet.status === "WON" ? "text-green-500" : ""}
                            ${bet.status === "LOST" ? "text-red-500" : ""}
                          `}
                    >
                      {bet.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {bet.status === "WON"
                      ? `${bet.payout.toFixed(2)} SOL`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


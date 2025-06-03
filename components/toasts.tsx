// components/Toasts.tsx

import React from "react";
import Image from "next/image";
import Success from "@/public/assets/success-bet.png";
import BetFailed from "@/public/assets/BetFailure.png";
import Cheers from "@/public/assets/cheers.png";
import Withdraw from "@/public/assets/Withdrawal.png";

////////////////////////////////////////////////////////////////////////////////
// 1) ClaimNotConnectedToast
////////////////////////////////////////////////////////////////////////////////
export function ClaimNotConnectedToast({
  theme,
}: {
  theme: "light" | "dark";
}) {
  return (
    <div
      className={`
        glass  rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="max-w-sm mx-auto text-xs font-semibold">
        Please connect your wallet to claim rewards
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 2) NoClaimableBetsToast
////////////////////////////////////////////////////////////////////////////////
export function NoClaimableBetsToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
        glass text-center  rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="max-w-sm mx-auto text-xs font-semibold">
        No claimable bets available
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 3) ClaimSuccessToast
////////////////////////////////////////////////////////////////////////////////
export function ClaimSuccessToast({
  theme,
  claimableAmount,
}: {
  theme: string | undefined;
  claimableAmount: number;
}) {
  return (
    <div
      className={`
        w-full glass text-center h-[400px] max-w-[600px] rounded-2xl
        shadow-xl animate-toast-bounce ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-center p-4 pb-12 mt-16
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <div className="w-full animate-vibrate h-[280px] relative mb-4">
        <Image
          src={Cheers}
          alt="Cheers"
          fill
          className="object-contain rounded-xl"
        />
      </div>

      <h3 className="font-bold text-2xl animate-toast-pulse mb-2">
        Cheers to more withdrawals
      </h3>

      <p className="max-w-sm mx-auto text-sm">
        You have withdrawn {claimableAmount.toFixed(4)} SOL
      </p>
    </div>
  );
}

export function ClaimSuccessToastMini({
    theme,
    claimableAmount,
  }: {
    theme: string | undefined;
    claimableAmount: number;
  }) {
    return (
      <div
        className={`
          w-full glass text-center px-8 rounded-2xl
          shadow-xl animate-toast-bounce ring-1 ring-black ring-opacity-5 overflow-hidden
          flex flex-col items-center p-4 mt-8
          ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
        `}
        style={{
          animation: "fadeInDown 200ms ease-out forwards",
        }}
      >
        <h3 className="font-bold text-sm animate-toast-pulse mb-2">
          Cheers to more withdrawals
        </h3>
  
        <p className="max-w-sm mx-auto text-xs">
          You have withdrawn {claimableAmount.toFixed(4)} SOL
        </p>
      </div>
    );
  }

////////////////////////////////////////////////////////////////////////////////
// 4) ClaimFailureToast
////////////////////////////////////////////////////////////////////////////////
export function ClaimFailureToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
        glass text-center animate-toast-bounce rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      {/* <div className="w-full animate-pulse h-[80px] relative mb-4">
        <Image
          src={Withdraw}
          alt="Withdrawal Failed"
          fill
          className="object-contain rounded-xl"
        />
      </div> */}

      <h3 className="font-bold text-sm text-center animate-toast-pulse mb-2">
        Withdrawal Failed
      </h3>

      <p className="text-xs">
        You were unable to withdraw, please recheck and try again
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 5) BetSuccessToast
////////////////////////////////////////////////////////////////////////////////
export function BetSuccessToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
        glass animate-toast-bounce-in w-full glass text-center h-[400px] max-w-[600px]
        rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-center p-4 pb-12 mt-16
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <div className="animate-vibrate w-full h-[280px] relative mb-4">
        <Image
          src={Success}
          alt="Bet Successful"
          fill
          className="object-contain rounded-xl"
        />
      </div>
      <h3 className="font-bold text-2xl mb-2 animate-toast-pulse">
        Bet successful
      </h3>
      <p className="max-w-sm mx-auto text-sm">
        You have successfully placed a bet, cheers to potential wins
      </p>
    </div>
  );
}


export function BetSuccessToastMini({
    theme,
  }: {
    theme: string | undefined;
  }) {
    return (
      <div
        className={`
          glass animate-toast-bounce-in
          rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
          flex flex-col items-start p-4 mt-8
        `}
        style={{
          animation: "fadeInDown 200ms ease-out forwards",
        }}
      >
        <h3 className="font-bold text-sm mb-2 animate-toast-pulse">
          Bet successful
        </h3>
        <p className="max-w-sm mx-auto text-xs">
          You have successfully placed a bet, cheers to potential wins
        </p>
      </div>
    );
  }

////////////////////////////////////////////////////////////////////////////////
// 6) BetFailedToast
////////////////////////////////////////////////////////////////////////////////
export function BetFailedToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
        glass text-left animate-toast-bounce rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      {/* <div className="w-full animate-pulse h-[280px] relative mb-4">
        <Image
          src={BetFailed}
          alt="Bet Failed"
          fill
          className="object-contain rounded-xl"
        />
      </div> */}

      <h3 className="font-bold text-sm text-center animate-toast-pulse mb-2">
        Bet Failed
      </h3>

      <p className="text-xs">
        You were unable to place the bet, please try again later
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 7) AlreadyPlacedBetToast
////////////////////////////////////////////////////////////////////////////////
export function AlreadyPlacedBetToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
        glass rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="max-w-sm mx-auto text-xs font-semibold">
        You have already placed a bet on this round.
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 8) InvalidAmountToast
////////////////////////////////////////////////////////////////////////////////
export function InvalidAmountToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
         glass text-left rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="max-w-sm mx-auto text-xs font-semibold">
        Please enter a valid amount
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 9) BettingNotAvailableToast
////////////////////////////////////////////////////////////////////////////////
export function BettingNotAvailableToast({
  theme,
}: {
  theme: string | undefined;
}) {
  return (
    <div
      className={`
        glass rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-center p-4 mt-8
        ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"}
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="max-w-sm mx-auto text-xs font-semibold">
        Betting is not available for this round
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 10) ConnectWalletBetToast
////////////////////////////////////////////////////////////////////////////////
export function ConnectWalletBetToast() {
  return (
    <div
      className={`
         glass rounded-2xl
        shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden
        flex flex-col items-start 
      `}
      style={{
        animation: "fadeInDown 200ms ease-out forwards",
      }}
    >
      <p className="text-sm font-semibold">
        Please connect your wallet first
      </p>
    </div>
  );
}

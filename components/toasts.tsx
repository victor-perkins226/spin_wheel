// components/Toasts.tsx

import React from "react";
import Image from "next/image";
import Success from "@/public/assets/success-bet.png";
import BetFailed from "@/public/assets/BetFailure.png";
import Cheers from "@/public/assets/cheers.png";
import Withdraw from "@/public/assets/Withdrawal.png";
import { formatNum } from "@/lib/utils";
import { useTranslation } from "next-i18next";

////////////////////////////////////////////////////////////////////////////////
// 1) ClaimNotConnectedToast
////////////////////////////////////////////////////////////////////////////////
export function ClaimNotConnectedToast({
  theme,
}: {
  theme: "light" | "dark";
}) {
const {t} = useTranslation('common')

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
        {t('toasts.notConnected')}
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
const {t} = useTranslation('common')

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
        {t('toasts.noClaimable')}
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
const {t} = useTranslation('common')

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
       {t('toasts.claimSuccess')}
      </h3>

      <p className="max-w-sm mx-auto text-sm">
        {t('toasts.withdraw')} {formatNum(claimableAmount)} SOL
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
const {t} = useTranslation('common')

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
             {t('toasts.claimSuccess')}
        </h3>
  
        <p className="max-w-sm mx-auto text-xs">
            {t('toasts.withdraw')} {formatNum(claimableAmount)} SOL
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
const {t} = useTranslation('common')

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
        {t('toasts.withdrawFailed')}
      </h3>

      <p className="text-xs">
        {t('toasts.withdrawFailedReason')}
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
const {t} = useTranslation('common')

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
       {t('toasts.betPlaced')}
      </h3>
      <p className="max-w-sm mx-auto text-sm">
        {t('toasts.betPlacedMessage')}
      </p>
    </div>
  );
}


export function BetSuccessToastMini({
    theme,
  }: {
    theme: string | undefined;
  }) {
const {t} = useTranslation('common')

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
         {t('toasts.betPlaced')}
        </h3>
        <p className="max-w-sm mx-auto text-xs">
         {t('toasts.betPlacedMessage')}
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
const {t} = useTranslation('common')

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
       {t('toasts.betFailed')}
      </h3>

      <p className="text-xs">
        {t('toasts.betFailedMessage')}
      </p>
    </div>
  );
}

export function TransactionFailedToast({
  theme,
}: {
  theme: string | undefined;
}) {
const {t} = useTranslation('common')

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

      <h3 className="font-bold text-sm text-center animate-toast-pulse mb">
       {t('toasts.transactionFailed')}
      </h3>
{/* 
      <p className="text-xs">
        You were unable to place the bet, please try again later
      </p> */}
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
const {t} = useTranslation('common')

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
        {t('toasts.alreadyPlaced')}
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
const {t} = useTranslation('common')

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
       {t('toasts.validAmount')}
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
const {t} = useTranslation('common')

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
        {t('toasts.notAvailable')}"
      </p>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// 10) ConnectWalletBetToast
////////////////////////////////////////////////////////////////////////////////
export function ConnectWalletBetToast() {
const {t} = useTranslation('common')

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
        {t('toasts.connectWallet')}
      </p>
    </div>
  );
}


export function ReferralToast() {
// const {t} = useTranslation('common')

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
        Input a valid referral means 
      </p>
    </div>
  );
}

export function ReferralToastFailed() {
// const {t} = useTranslation('common')

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
        Failed to submit your referral. Please try again.
      </p>
    </div>
  );
}



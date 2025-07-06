/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  AccountInfo,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { BN, ProgramError } from "@project-serum/anchor";
import { useProgram } from "./useProgram";
import { useCallback, useEffect, useState, useRef } from "react";
import { UserBet, ClaimableBet, UserBetAccount, CancelableBet } from "@/types/round";
import Success from "@/public/assets/success-bet.png";
import toast from "react-hot-toast";
import { PROGRAM_ID } from "@/lib/config";
import {
  BetFailedToast,
  BetSuccessToast,
  BetSuccessToastMini,
  TransactionFailedToast,
} from "@/components/toasts";
import { useTheme } from "next-themes";
import { useRoundManager } from "./roundManager";
import { useConfig } from "./useConfig";

// Define the return type for the hook
interface SolPredictorHook {
  handlePlaceBet: (
    roundId: number,
    isBull: boolean,
    amount: number
  ) => Promise<boolean>;
  handleClaimPayout: (roundId: number) => Promise<any>;
  handleCancelBet: (roundId: number) => Promise<any>;
  fetchUserBets: () => Promise<ClaimableBet[]>;
  claimableBets: ClaimableBet[];
  cancelableBets: CancelableBet[];
  userBets: UserBet[];
  isPlacingBet: boolean;
}

const programId = new PublicKey(PROGRAM_ID);
export const useSolPredictor = (): SolPredictorHook & { userBalance: number } => {
  const { publicKey, connected } = useWallet();
  const { program } = useProgram();
  const [claimableBets, setClaimableBets] = useState<ClaimableBet[]>([]);
  const [cancelableBets, setCancelableBets] = useState<CancelableBet[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const pendingTransactionRef = useRef<string | null>(null);
  const { theme } = useTheme();
  const [userBalance, setUserBalance] = useState<number>(0);
  const { data: config } = useConfig();

  const fetchUserBalance = useCallback(async () => {
    if (!publicKey || !program) return;
    const lamports = await program.provider.connection.getBalance(publicKey);
    setUserBalance(lamports / LAMPORTS_PER_SOL);
  }, [ publicKey, program ]);

  // On mount & whenever wallet changes
  useEffect(() => {
    fetchUserBalance();
  }, [ fetchUserBalance ]);


  
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    programId
  );

  const getRoundPda = (roundNumber: number) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("round"), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
      program!.programId
    )[0];


  const getUserBetPda = (user: PublicKey, roundNumber: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        user.toBuffer(),
        new BN(roundNumber).toArrayLike(Buffer, "le", 8),
      ],
      program!.programId
  )[0];

  
  const fetchUserBets = useCallback(async (): Promise<ClaimableBet[]> => {
    if (!publicKey || !connected || !program) {
      setClaimableBets([]);
      setCancelableBets([]);
      setUserBets([]);
      return [];
    }

    // 1) fetch userBet accounts
    const userBetAccounts = (await program.account.userBet.all([
      { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
    ])) as { publicKey: PublicKey; account: UserBetAccount }[];

    if (userBetAccounts.length === 0) {
      setUserBets([]);
      setClaimableBets([]);
      setCancelableBets([]);
      return [];
    }

    const uniqueRoundNumbers = Array.from(
      new Set(userBetAccounts.map((acc) => acc.account.roundNumber.toNumber()))
    );
    const roundPdas = uniqueRoundNumbers.map((rn) => getRoundPda(rn));

    const chunkSize = 100;
    const allAccountInfos: (AccountInfo<Buffer> | null)[] = [];
    for (let i = 0; i < roundPdas.length; i += chunkSize) {
      const slice = roundPdas.slice(i, i + chunkSize);
      const infos = await program.provider.connection.getMultipleAccountsInfo(
        slice
      );
      allAccountInfos.push(...infos);
    }

    const roundsByNumber = new Map<number, any>();
    uniqueRoundNumbers.forEach((rn, idx) => {
      const info = allAccountInfos[idx];
      if (info?.data) {
        const decoded = program.account.round.coder.accounts.decode(
          "Round",
          info.data
        );
        roundsByNumber.set(rn, decoded);
      }
    });

    const bets: UserBet[] = [];
    const claimable: ClaimableBet[] = [];
    const cancelable: CancelableBet[] = [];
    let isPaused = false;
    if (!config) {
      const configAccount = await program.account.config.fetch(configPda);
      isPaused = configAccount.isPaused;
    } else {
      isPaused = config.isPaused;
    }
    for (const { account } of userBetAccounts) {
      const roundNumber = account.roundNumber.toNumber();
      const predictBull = account.predictBull;
      const amountSol = account.amount.toNumber() / LAMPORTS_PER_SOL;
      const claimed = account.claimed;

      let status: UserBet["status"] = "PENDING";
      let payout = 0;

      const roundData = roundsByNumber.get(roundNumber);
      if (!account.claimed && isPaused) {
        cancelable.push({ roundNumber, amount: amountSol });
      }

      if (roundData && !roundData.isActive) {
        const lockPrice = Number(roundData.lockPrice);
        const endPrice = Number(roundData.endPrice);
        const isCorrect = predictBull
          ? endPrice > lockPrice
          : endPrice < lockPrice;
        status = isCorrect ? (claimed ? "CLAIMED" : "WON") : "LOST";
        if (isCorrect && Number(roundData.rewardBaseCalAmount) > 0) {
          payout =
            (amountSol * Number(roundData.rewardAmount)) /
            Number(roundData.rewardBaseCalAmount);
        }
      }

      const userBetPda = getUserBetPda(publicKey, roundNumber).toBase58();
      bets.push({
        id: userBetPda,
        roundId: roundNumber,
        direction: predictBull ? "up" : "down",
        status,
        amount: amountSol,
        payout,
      });

      if (status === "WON") {
        claimable.push({ roundNumber, amount: amountSol, predictBull, payout });
      }

    }

    setUserBets(bets);
    setClaimableBets(claimable);
    console.log({cancelable})
    setCancelableBets(cancelable);
    return claimable;
  }, [publicKey, connected, program ]);

  const handlePlaceBet = useCallback(
    async (roundId: number, isBull: boolean, amount: number) => {
      if (!publicKey) return false;
      if (!connected || !program) return false;
      if (amount <= 0) return false;
      if (amount < 0.001) return false;
      if (isPlacingBet) return false;

      // Create a unique‐enough identifier so we don’t send the same slot+amount twice
      const transactionId = `${roundId}-${isBull}-${amount}-${Date.now()}`;
      if (pendingTransactionRef.current === transactionId) {
        return false;
      }

      pendingTransactionRef.current = transactionId;
      setIsPlacingBet(true);

      try {
        // 1) Derive our PDAs
        const roundPda = getRoundPda(roundId);
        // const escrowPda = getEscrowPda(roundId);
        const userBetPda = getUserBetPda(publicKey, roundId);

        // 2) (Optional) Quick on‐chain checks to see if the round is still accepting bets
        try {
          const roundAccount = await program.account.round.fetch(roundPda);
          const now = Date.now() / 1000;
          const lockTime = Number(roundAccount.lockTime);

          if (now >= lockTime || !roundAccount.isActive) {
            return false;
          }
        } catch (roundErr: any) {
          // If the account truly doesn’t exist, it’ll throw “Account does not exist”—we let it proceed.
          if (!roundErr.message?.includes("does not exist")) {
            console.error("Error validating round:", roundErr);
            return false;
          }
        }

        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

        // 3) Call the on‐chain RPC. We wrap only the rpc() inside its own try/catch.
        let txSignature: string;
        try {
          txSignature = await program!.methods
            .placeBet(new BN(lamports), isBull, new BN(roundId))
            .accounts({
              config: configPda,
              round: roundPda,
              userBet: userBetPda,
              user: publicKey,
              treasury: treasuryPda,
              systemProgram: SystemProgram.programId,
            })
            .signers([])
            .rpc();

          const confirmation =
            await program.provider.connection.confirmTransaction(
              txSignature,
              "confirmed" // or 'finalized' for extra safety
            );

          if (confirmation.value.err) {
            console.error("Transaction failed:", confirmation.value.err);
            return false;
          }

          // As soon as rpc() returns, we know the transaction was submitted.
          // Show the “Bet Success” toast immediately:
          toast.custom((t) => <BetSuccessToastMini theme={theme} />, {
            position: "top-right",
          });
        } catch (rpcError: any) {
          const msg = rpcError.message || "";

          // ── If Solana reports “already been processed,” we assume the first send succeeded, so we simply refresh and exit. ──
          if (msg.includes("already been processed")) {
            console.warn(
              "Transaction already seen on‐chain; treating as confirmed."
            );

            // (Optionally, you could show a different toast here:
            //  toast.custom((t) => <BetSuccessToast theme={theme} />, { position: "top-right" }); )

            try {
              await fetchUserBets();
 
            } catch (fetchErr) {
              console.error(
                "fetchUserBets() failed after an 'already processed' error:",
                fetchErr
              );
            }
            return true;
          }

          // ── If the user simply cancelled the wallet signature dialog ──
          if (
            rpcError.name === "WalletSignTransactionError" ||
            msg.includes("User rejected") ||
            msg.includes("User denied")
          ) {
            toast.custom((t) => <TransactionFailedToast theme={theme} />, {
              position: "top-right",
            });
            return false;
          }

          // ── If it’s an Anchor “ProgramError” (i.e. your on‐chain instruction failed) ──
          if (rpcError instanceof ProgramError) {
            toast.custom((t) => <BetFailedToast theme={theme} />, {
              position: "top-right",
            });
            return false;
          }

          // ── For any other unexpected RPC‐level error ──
          toast.custom((t) => <BetFailedToast theme={theme} />, {
            position: "top-right",
          });
          return false;
        }

        // 4) Only once we know on‐chain RPC has succeeded (and toast is already shown), refresh local bets:
        try {
          await fetchUserBets();
          await fetchUserBalance();
        } catch (fetchErr) {
          console.error(
            "fetchUserBets() failed after a successful bet:",
            fetchErr
          );
          // We do NOT show a toast here, because the bet itself succeeded.
        }

        return true;
      } finally {
        // Always clear the “placing” flag & pendingTransactionRef, even if the user hit an error above
        setIsPlacingBet(false);
        pendingTransactionRef.current = null;
      }
    },
    [
      publicKey,
      connected,
      program,
      configPda,
      fetchUserBets,
      getRoundPda,
      treasuryPda,
      getUserBetPda,
      isPlacingBet,
      theme,
      fetchUserBalance
    ]
  );

  const handleClaimPayout = useCallback(
    async (roundId: number) => {
      if (!publicKey || !connected || !program) {
        throw new Error("Wallet not connected or program not initialized");
      }

      try {
        const roundPda = getRoundPda(roundId);
        // const escrowPda = getEscrowPda(roundId);
        const userBetPda = getUserBetPda(publicKey, roundId);

        const instruction = await program!.methods
          .claimPayout(new BN(roundId))
          .accounts({
            config: configPda,
            round: roundPda,
            userBet: userBetPda,
            user: publicKey,
            treasury: treasuryPda,
          })
          .signers([])
          .instruction();

        return instruction;
      } catch (error: any) {
        console.error(
          `Failed to build claim instruction for round ${roundId}:`,
          error
        );
        throw error;
      }
    },
    [
      publicKey,
      connected,
      program,
      getRoundPda,
      treasuryPda,
      getUserBetPda,
      configPda,
      fetchUserBalance,
    ]
  );

  const handleCancelBet = useCallback(async (roundId: number) => {
    if (!publicKey || !connected || !program) {
      throw new Error("Wallet not connected or program not initialized");
    }

    try {
      const roundPda = getRoundPda(roundId);
      const userBetPda = getUserBetPda(publicKey, roundId); 

      const instruction = await program!.methods
        .cancelBet(new BN(roundId))
        .accounts({
          config: configPda,
          round: roundPda,
          userBet: userBetPda,
          user: publicKey,
          treasury: treasuryPda,
        })
        .signers([])
        .instruction();

        return instruction;
     } catch (error: any) {
      console.error(`Failed to build cancel instruction for round ${roundId}:`, error);
      throw error;
    }
  }, [publicKey, connected, program, getRoundPda, getUserBetPda, configPda, treasuryPda]);

  useEffect(() => {
    if (publicKey && connected && program) {
      fetchUserBets();
    } else {
     
      setClaimableBets([]);
      setCancelableBets([]);
      setUserBets([]);
    }
  }, [publicKey, connected, program, fetchUserBets]);

  return {
    handlePlaceBet,
    handleClaimPayout,
    claimableBets,
    cancelableBets,
    userBets,
    fetchUserBets,
    userBalance,
    isPlacingBet,
    handleCancelBet,
  };
};

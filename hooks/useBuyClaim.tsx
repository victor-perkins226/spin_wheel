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
import axios from "axios";
import { API_URL } from "@/lib/config";

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
  claimableRewards: number,
  cancelableRewards: number,
  isPlacingBet: boolean;
}

const programId = new PublicKey(PROGRAM_ID);
export const useSolPredictor = (): SolPredictorHook & { userBalance: number } => {
  const { publicKey, connected } = useWallet();
  const { program } = useProgram();
  const [claimableBets, setClaimableBets] = useState<ClaimableBet[]>([]);
  const [claimableRewards, setClaimableRewards] = useState<number>(0);
  const [cancelableBets, setCancelableBets] = useState<CancelableBet[]>([]);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [cancelableRewards, setCancelableRewards] = useState<number>(0);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const pendingTransactionRef = useRef<string | null>(null);
  const { theme } = useTheme();
  const [userBalance, setUserBalance] = useState<number>(0);

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
    if (!publicKey || !connected) {
      setClaimableBets([]);
      setCancelableBets([]);
      setUserBets([]);
      return [];
    }

    const walletAddress = publicKey.toBase58();

    try {
      // Fetch all data in parallel for better performance
      const [betHistoryResponse, claimableResponse, cancelableResponse] = await Promise.all([
        // Fetch bet history (paginated)
        axios.get(`${API_URL}/user/bet-history/${walletAddress}`, {
          params: { limit: 10, offset: 0 } // Get first 100 bets
        }),
        // Fetch claimable bets
        axios.get(`${API_URL}/user/claimable-bets/${walletAddress}`),
        // Fetch cancelable bets
        axios.get(`${API_URL}/user/cancelable-bets/${walletAddress}`)
      ]);

      // Process bet history data
      const betHistoryData = betHistoryResponse.data.data || [];
      const userBets: UserBet[] = betHistoryData.map((bet: any) => ({
        id: bet.id,
        roundId: bet.epoch,
        direction: bet.direction === 'up' ? 'up' : 'down',
        status: bet.status.toUpperCase() as UserBet['status'],
        amount: parseFloat(bet.amount) / LAMPORTS_PER_SOL,
        payout: parseFloat(bet.payout || '0') / LAMPORTS_PER_SOL,
        walletAddress: bet.walletAddress,
        betTime: bet.betTime,
        createdAt: bet.createdAt,
      }));

      // Process claimable bets data
      const claimableData = claimableResponse.data.data || [];
      const claimableBets: ClaimableBet[] = claimableData.map((bet: any) => ({
        roundNumber: bet.epoch,
        amount: parseFloat(bet.amount) / LAMPORTS_PER_SOL,
        predictBull: bet.direction === 'up',
        payout: parseFloat(bet.payout || '0') / LAMPORTS_PER_SOL,
      }));

      // Process cancelable bets data
      const cancelableData = cancelableResponse.data.data || [];
      const cancelableBets: CancelableBet[] = cancelableData.map((bet: any) => ({
        roundNumber: bet.epoch,
        amount: parseFloat(bet.amount) / LAMPORTS_PER_SOL,
      }));

      // Update state
      const claimableRewards = claimableBets.reduce((tot, b) => tot + (b.payout || 0), 0);
      setClaimableRewards(claimableRewards);

      const cancelableRewards = cancelableBets.reduce((tot, b) => tot + (b.amount || 0), 0);
      setCancelableRewards(cancelableRewards);

      setUserBets(userBets);
      setClaimableBets(claimableBets);
      setCancelableBets(cancelableBets);

      return claimableBets;
    } catch (error) {
      console.error('Failed to fetch user bets:', error);
      
      // Set empty arrays on error
      setUserBets([]);
      setClaimableBets([]);
      setCancelableBets([]);
      
      return [];
    }
  }, [publicKey, connected]);

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
          console.log({rpcError})
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
      }
      catch (error)  {
        console.log("error", error)
      }
      finally {
        // Always clear the “placing” flag & pendingTransactionRef, even if the user hit an error above
        setIsPlacingBet(false);
        pendingTransactionRef.current = null;
        return false;
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
  }, [publicKey, connected, program]);

  useEffect(() => {
    // Call safeFetchMoreRounds every 30 seconds (adjust as needed)
    const intervalId = setInterval(() => {
      fetchUserBets();
    }, 30_000); // 30,000 ms = 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchUserBets]);

  useEffect(() => {
    // Call safeFetchMoreRounds every 30 seconds (adjust as needed)
    const intervalId = setInterval(() => {
      fetchUserBalance();
    }, 30_000); // 30,000 ms = 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchUserBalance]);

  return {
    handlePlaceBet,
    handleClaimPayout,
    claimableBets,
    claimableRewards,
    cancelableBets,
    cancelableRewards,
    userBets,
    fetchUserBets,
    userBalance,
    isPlacingBet,
    handleCancelBet,
  };
};

/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { BN, ProgramError } from "@project-serum/anchor";
import { useProgram } from "./useProgram";
import { useCallback, useEffect, useState, useRef } from "react";
import { UserBet, ClaimableBet, UserBetAccount } from "@/types/round";
import Success from "@/public/assets/success-bet.png";
import toast from "react-hot-toast";
import { PROGRAM_ID } from "@/lib/config";

// Define the return type for the hook
interface SolPredictorHook {
    handlePlaceBet: (roundId: number, isBull: boolean, amount: number) => Promise<boolean>;
    handleClaimPayout: (roundId: number) => Promise<any>;
    fetchUserBets: () => Promise<ClaimableBet[]>;
    claimableBets: ClaimableBet[];
    userBets: UserBet[];
    isPlacingBet: boolean;
}

const programId = new PublicKey(PROGRAM_ID);
export const useSolPredictor = (): SolPredictorHook => {
    const { publicKey, connected } = useWallet();
    const { program } = useProgram();
    const [claimableBets, setClaimableBets] = useState<ClaimableBet[]>([]);
    const [userBets, setUserBets] = useState<UserBet[]>([]);
    const [isPlacingBet, setIsPlacingBet] = useState(false);
    const pendingTransactionRef = useRef<string | null>(null);

    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
    const getRoundPda = (roundNumber: number) =>
        PublicKey.findProgramAddressSync(
            [Buffer.from("round"), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
            program!.programId
        )[0];

    const getEscrowPda = (roundNumber: number) =>
        PublicKey.findProgramAddressSync(
            [Buffer.from("escrow"), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
            program!.programId
        )[0];

    const getUserBetPda = (user: PublicKey, roundNumber: number) =>
        PublicKey.findProgramAddressSync(
            [Buffer.from("user_bet"), user.toBuffer(), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
            program!.programId
        )[0];

    // const fetchUserBets = useCallback(async () => {
    //     if (!publicKey || !connected || !program) {
    //         console.log('Cannot fetch bets: wallet not connected or program not initialized');
    //         setClaimableBets([]);
    //         setUserBets([]);
    //         return [];
    //     }

    //     try {
    //         console.log('Fetching user bets for:', publicKey.toBase58());

    //         const userBetAccounts = await program.account.userBet.all([
    //             {
    //                 memcmp: {
    //                     offset: 8,
    //                     bytes: publicKey.toBase58(),
    //                 },
    //             },
    //         ]) as unknown as { publicKey: PublicKey; account: UserBetAccount }[];

    //         const bets: UserBet[] = await Promise.all(
    //             userBetAccounts.map(async (account) => {
    //                 const roundNumber = account.account.roundNumber.toNumber();
    //                 const predictBull = account.account.predictBull;
    //                 const amount = account.account.amount.toNumber() / LAMPORTS_PER_SOL;
    //                 const claimed = account.account.claimed;

    //                 const [userBetPda] = PublicKey.findProgramAddressSync(
    //                     [Buffer.from('user_bet'), publicKey.toBuffer(), new BN(roundNumber).toArrayLike(Buffer, 'le', 8)],
    //                     programId
    //                 );

    //                 let status: UserBet['status'] = 'PENDING';
    //                 let payout = 0;

    //                 try {
    //                     const [roundPda] = PublicKey.findProgramAddressSync(
    //                         [Buffer.from('round'), new BN(roundNumber).toArrayLike(Buffer, 'le', 8)],
    //                         programId
    //                     );
    //                     const round = await program!.account.round.fetch(roundPda);

    //                     if (!round.isActive) {
    //                         const isCorrect = predictBull
    //                             ? Number(round.endPrice) > Number(round.lockPrice)
    //                             : Number(round.endPrice) < Number(round.lockPrice);
    //                         status = isCorrect ? (claimed ? 'CLAIMED' : 'WON') : 'LOST';
    //                         if (isCorrect && Number(round.rewardBaseCalAmount) > 0) {
    //                             payout = (amount * Number(round.rewardAmount)) / Number(round.rewardBaseCalAmount);
    //                         }
    //                     }
    //                 } catch (error) {
    //                     console.error(`Failed to fetch round ${roundNumber} for status:`, error);
    //                 }

    //                 return {
    //                     id: userBetPda.toBase58(),
    //                     roundId: roundNumber,
    //                     direction: predictBull ? 'up' : 'down',
    //                     status,
    //                     amount,
    //                     payout,
    //                 };
    //             })
    //         );

    //         const claimable: ClaimableBet[] = bets
    //             .filter((bet) => bet.status === 'WON')
    //             .map((bet) => ({
    //                 roundNumber: bet.roundId,
    //                 amount: bet.amount,
    //                 predictBull: bet.direction === 'up',
    //                 payout: bet.payout,
    //             }));

    //         setUserBets(bets);
    //         setClaimableBets(claimable);
    //         return claimable;
    //     } catch (error) {
    //         console.error('Failed to fetch user bets:', error);
    //         setClaimableBets([]);
    //         setUserBets([]);
    //         return [];
    //     }
    // }, [publicKey, connected, program]);
    const fetchUserBets = useCallback(async (): Promise<ClaimableBet[]> => {
        if (!publicKey || !connected || !program) {
          console.log('Cannot fetch bets: wallet not connected or program not initialized');
          setClaimableBets([]);
          setUserBets([]);
          return [];
        }
      
        try {
          // 1) Fetch all userBet accounts belonging to this wallet
          const userBetAccounts = (await program.account.userBet.all([
            {
              memcmp: {
                offset: 8, // make sure this offset is correct
                bytes: publicKey.toBase58(),
              },
            },
          ])) as unknown as { publicKey: PublicKey; account: UserBetAccount }[];
      
          // 2) If no bets, early exit
          if (userBetAccounts.length === 0) {
            setUserBets([]);
            setClaimableBets([]);
            return [];
          }
      
          // 3) Build a unique list of round PDAs so we can batch‐fetch them
          const uniqueRoundNumbers = Array.from(
            new Set(userBetAccounts.map(acc => acc.account.roundNumber.toNumber()))
          );
          const roundPdas = uniqueRoundNumbers.map(rn => getRoundPda(rn));
      
          // 4) Batch‐fetch all round accounts in one RPC
          //    This uses getMultipleAccountsInfo rather than N separate .fetch() calls
          const roundInfos = await program.provider.connection.getMultipleAccountsInfo(roundPdas);
      
          // 5) Decode them into Anchor round structs
          const roundsByNumber = new Map<number, any>(); // Map<roundNumber, decodedRound>
          uniqueRoundNumbers.forEach((rn, idx) => {
            const info = roundInfos[idx];
            if (info && info.data) {
              // Anchor’s coder can decode it:
              const decoded = program.account.round.coder.accounts.decode('Round', info.data);
              roundsByNumber.set(rn, decoded);
            }
          });
      
          // 6) Build UserBet[] and ClaimableBet[] in one pass
          const bets: UserBet[] = [];
          const claimable: ClaimableBet[] = [];
      
          for (const { account } of userBetAccounts) {
            const roundNumber = account.roundNumber.toNumber();
            const predictBull = account.predictBull;
            const amountSol = account.amount.toNumber() / LAMPORTS_PER_SOL;
            const claimed = account.claimed;
      
            let status: UserBet['status'] = 'PENDING';
            let payout = 0;
      
            const roundData = roundsByNumber.get(roundNumber);
            if (roundData) {
              // Only decide win/loss if round is inactive (i.e. finished)
              if (!roundData.isActive) {
                const lockPrice = Number(roundData.lockPrice);
                const endPrice = Number(roundData.endPrice);
                const isCorrect = predictBull ? endPrice > lockPrice : endPrice < lockPrice;
                status = isCorrect ? (claimed ? 'CLAIMED' : 'WON') : 'LOST';
      
                if (isCorrect && Number(roundData.rewardBaseCalAmount) > 0) {
                  payout = (amountSol * Number(roundData.rewardAmount)) / Number(roundData.rewardBaseCalAmount);
                }
              }
            }
      
            // Compute the PDA once (use your helper)
            const userBetPda = getUserBetPda(publicKey, roundNumber).toBase58();
            bets.push({
              id: userBetPda,
              roundId: roundNumber,
              direction: predictBull ? 'up' : 'down',
              status,
              amount: amountSol,
              payout,
            });
      
            // If status is WON (but not yet claimed), include in claimable
            if (status === 'WON') {
              claimable.push({
                roundNumber,
                amount: amountSol,
                predictBull,
                payout,
              });
            }
          }
      
          // Finally update state
          setUserBets(bets);
          setClaimableBets(claimable);
          return claimable;
      
        } catch (err) {
          console.error("Failed to fetch user bets:", err);
          setUserBets([]);
          setClaimableBets([]);
          return [];
        }
      }, [publicKey, connected, program]);
      
    const handlePlaceBet = useCallback(async (roundId: number, isBull: boolean, amount: number) => {
        if (!publicKey) {
            // toast("Please connect your wallet.");
            return false;
        }

        if (!connected || !program) {
            // toast("Please connect your wallet and ensure program is loaded.");
            return false;
        }

        if (amount <= 0) {
            // toast("Please enter a valid bet amount.");
            return false;
        }

        if (amount < 0.001) {
            // toast("Minimum bet amount is 0.001 SOL.");
            return false;
        }

        // Prevent duplicate submissions
        if (isPlacingBet) {
            // toast("Transaction in progress, please wait...");
            return false;
        }

        // Create unique transaction identifier
        const transactionId = `${roundId}-${isBull}-${amount}-${Date.now()}`;
        if (pendingTransactionRef.current === transactionId) {
            // toast("Duplicate transaction detected, please wait...");
            return false;
        }

        setIsPlacingBet(true);
        pendingTransactionRef.current = transactionId;

        try {
            const roundPda = getRoundPda(roundId);
            const escrowPda = getEscrowPda(roundId);
            const userBetPda = getUserBetPda(publicKey, roundId);

            try {
                const roundAccount = await program.account.round.fetch(roundPda);
                if (roundAccount) {
                    const now = Date.now() / 1000;
                    const lockTime = Number(roundAccount.lockTime);
                    if (now >= lockTime) {
                        // toast("This round is no longer accepting bets.");
                        return false;
                    }

                    if (!roundAccount.isActive) {
                        // toast("This round is not active.");
                        return false;
                    }
                }
            } catch (roundError: any) {
                if (!roundError.message?.includes("Account does not exist")) {
                    console.error("Error validating round:", roundError);
                    // toast("Failed to validate round. Please try again.");
                    return false;
                }
                console.log(`Round ${roundId} account doesn't exist yet, proceeding with bet placement`);
            }

            const lamports = Math.floor(amount * 1_000_000_000);

            console.log("Placing bet with params:", {
                roundId,
                isBull,
                amount,
                lamports,
                userPubkey: publicKey.toBase58(),
                transactionId
            });

            try {
                // Use .rpc() method with proper error handling
                const tx = await program!.methods
                    .placeBet(new BN(lamports), isBull, new BN(roundId))
                    .accounts({
                        config: configPda,
                        round: roundPda,
                        userBet: userBetPda,
                        user: publicKey,
                        escrow: escrowPda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([])
                    .rpc();

                await fetchUserBets();
                return true;
                
            } catch (rpcError: any) {
                console.error("RPC Error details:", rpcError);
                
                // Handle ProgramError specifically
                if (rpcError instanceof ProgramError) {
                    const errorCode = rpcError.code;
                    console.log("Program error code:", errorCode);
                    
                    switch (errorCode) {
                        case 6012:
                            // toast("Contract is paused.");
                            break;
                        case 6013:
                            // toast("Bet amount must be at least 0.001 SOL.");
                            break;
                        case 6014:
                            // toast("You have already bet in this round.");
                            break;
                        case 6022:
                            // toast("Round is locked for betting.");
                            break;
                        case 6001:
                            // toast("Round is not active.");
                            break;
                        case 6007:
                            // toast("Invalid round number.");
                            break;
                        case 6010:
                            // toast("Insufficient funds in escrow.");
                            break;
                        default:
                            // toast(`Program error: ${rpcError.msg || `Code ${errorCode}`}`);
                            break;
                    }
                    return false;
                }

                // Handle other RPC errors
                if (rpcError.message?.includes("This transaction has already been processed")) {
                    // toast("Transaction already processed. Please check your bets.");
                    await fetchUserBets();
                    return false;
                }

                if (rpcError.message?.includes("Transaction was not confirmed")) {
                    // toast("Transaction failed to confirm. Please try again with a new transaction.");
                    return false;
                }

                if (rpcError.message?.includes("Blockhash not found")) {
                    // toast("Transaction expired. Please try again.");
                    return false;
                }

                if (rpcError.message?.includes("User rejected") || rpcError.message?.includes("User denied")) {
                    // toast("Transaction was cancelled.");
                    return false;
                }

                if (rpcError.message?.includes("insufficient funds")) {
                    // toast("Insufficient SOL balance to place bet.");
                    return false;
                }

                if (rpcError.message?.includes("Account does not exist")) {
                    // toast("Round not yet initialized. Please try again in a moment.");
                    return false;
                }

                // Log detailed error for debugging
                console.error("Detailed RPC error:", rpcError);
                if (rpcError.logs) {
                    console.error("Error logs:", rpcError.logs);
                }

                // toast(`Failed to place bet: ${rpcError.message || "Unknown error"}`);
                return false;
            }
            
        } catch (error: any) {
            console.error("Place bet failed", error);
            return false;
            
            // Final fallback error handling
            // toast(`An unexpected error occurred: ${error.message || "Unknown error"}`);
        } finally {
            setIsPlacingBet(false);
            pendingTransactionRef.current = null;
        }
    }, [publicKey, connected, getRoundPda, getEscrowPda, getUserBetPda, program, configPda, fetchUserBets]);

    const handleClaimPayout = useCallback(async (roundId: number) => {
        if (!publicKey || !connected || !program) {
            throw new Error('Wallet not connected or program not initialized');
        }

        try {
            const roundPda = getRoundPda(roundId);
            const escrowPda = getEscrowPda(roundId);
            const userBetPda = getUserBetPda(publicKey, roundId);

            const instruction = await program!.methods
                .claimPayout(new BN(roundId))
                .accounts({
                    config: configPda,
                    round: roundPda,
                    userBet: userBetPda,
                    user: publicKey,
                    escrow: escrowPda,
                })
                .signers([])
                .instruction(); 

            return instruction;
        } catch (error: any) {
            console.error(`Failed to build claim instruction for round ${roundId}:`, error);
            throw error;
        }
    }, [publicKey, connected, program, getRoundPda, getEscrowPda, getUserBetPda, configPda]);

    useEffect(() => {
        if (publicKey && connected && program) {
            fetchUserBets();
        } else {
            console.log('Skipping fetchUserBets: wallet not connected or program not initialized');
            setClaimableBets([]);
            setUserBets([]);
        }
    }, [publicKey, connected, program, fetchUserBets]);

    return { handlePlaceBet, handleClaimPayout, claimableBets, userBets, fetchUserBets, isPlacingBet };
};
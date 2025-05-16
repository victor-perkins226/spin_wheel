/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
// import * as idl from "@/lib/idl.json";
import { useProgram } from "./useProgram";
import { useCallback, useEffect, useState } from "react";
import { UserBet } from "@/types/round";

interface ClaimableBet {
    roundNumber: number;
    amount: number; // User's bet amount
    predictBull: boolean;
    payout: number; // Calculated claimable amount
}
// Define the return type for the hook
interface SolPredictorHook {
    handlePlaceBet: (roundId: number, isBull: boolean, amount: number) => Promise<void>;
    handleClaimPayout: (roundId: number) => Promise<void>;
    claimableBets: ClaimableBet[];
}

const programId = new PublicKey("AKui3UEpyUEhtnqsDChTL76DFncYx6rRqp6CSShnUm9r")

export const useSolPredictor = (): SolPredictorHook => {
    const { publicKey,connected } = useWallet();
    const { program } = useProgram();
    const [claimableBets, setClaimableBets] = useState<ClaimableBet[]>([]);


    // if (!program) return;

    // PDA derivation functions (as provided)
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

    const fetchUserBets = useCallback(async () => {
        if (!publicKey || !connected || !program) {
            console.log('Cannot fetch bets: wallet not connected or program not initialized');
            setClaimableBets([]);
            return [];
          }

        try {
            // Fetch user_bet accounts for the user
            const userBetAccounts = await program!.account.userBet.all([
                {
                    memcmp: {
                        offset: 8, // Discriminator offset
                        bytes: publicKey.toBase58(),
                    },
                },
            ]);

            const bets: UserBet[] = await Promise.all(
                userBetAccounts.map(async (account) => {
                    const roundNumber = account.account.roundNumber.toNumber();
                    const predictBull = account.account.predictBull;
                    const amount = account.account.amount.toNumber() / LAMPORTS_PER_SOL;
                    const claimed = account.account.claimed;

                    let status: UserBet['status'] = 'PENDING';

                    if (claimed) {
                        status = 'CLAIMED';
                    } else {
                        try {
                            const [roundPda] = PublicKey.findProgramAddressSync(
                                [Buffer.from('round'), new BN(roundNumber).toArrayLike(Buffer, 'le', 8)],
                                programId
                            );
                            const round = await program!.account.round.fetch(roundPda);

                            if (!round.isActive) {
                                const isCorrect = predictBull
                                    ? Number(round.endPrice) > Number(round.lockPrice)
                                    : Number(round.endPrice) < Number(round.lockPrice);
                                status = isCorrect ? 'WON' : 'LOST';
                            }
                        } catch (error) {
                            console.error(`Failed to fetch round ${roundNumber} for status:`, error);
                        }
                    }

                    return {
                        roundId: roundNumber,
                        direction: predictBull ? 'up' : 'down',
                        status,
                        amount,
                        payout: 0, // Calculated in claimableBets
                    };
                })
            );

            // Calculate claimable bets
            const claimable: ClaimableBet[] = [];
            for (const bet of bets) {
                if (bet.status !== 'WON') continue; // Only WON bets are claimable

                try {
                    const [roundPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from('round'), new BN(bet.roundId).toArrayLike(Buffer, 'le', 8)],
                        programId
                    );
                    const round = await program!.account.round.fetch(roundPda);

                    if (round.isActive || Number(round.rewardBaseCalAmount) === 0) continue;

                    const payout =
                        (bet.amount * Number(round.rewardAmount)) / Number(round.rewardBaseCalAmount);

                    claimable.push({
                        roundNumber: bet.roundId,
                        amount: bet.amount,
                        predictBull: bet.direction === 'up',
                        payout,
                    });
                } catch (error) {
                    console.error(`Failed to fetch round ${bet.roundId}:`, error);
                }
            }

            setClaimableBets(claimable);
            console.log('Fetched Claimable Bets:', claimable);
            return claimable;
        } catch (error) {
            console.error('Failed to fetch user bets:', error);
            setClaimableBets([]);
            return [];
        }
    }, [publicKey, program]);

    const handlePlaceBet = useCallback(async (roundId: number, isBull: boolean, amount: number) => {
        if (!publicKey) {
            alert("Please connect your wallet.");
            return;
        }

        if (amount <= 0) {
            alert("Please enter a valid bet amount.");
            return;
        }

        try {
            const roundPda = getRoundPda(roundId);
            const escrowPda = getEscrowPda(roundId);
            const userBetPda = getUserBetPda(publicKey, roundId);

            const lamports = amount * 1_000_000_000; // Convert SOL to lamports

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

            // Refresh bets after placing a bet
            await fetchUserBets();

            //   const { blockhash } = await connection.getLatestBlockhash();
            //   tx.recentBlockhash = blockhash;
            //   tx.feePayer = publicKey;

            //   const signature = await sendTransaction(tx, connection);
            //   await connection.confirmTransaction(signature, "confirmed");

            console.log(`Bet placed successfully: ${tx}`);
            alert("Bet placed successfully!");
        } catch (error: any) {
            console.error("Place bet failed", error);
            if (error.message.includes("6012")) {
                alert("Contract is paused.");
            } else if (error.message.includes("6013")) {
                alert(
                    `Bet amount must be at least 0.1 SOL.`
                );
            } else if (error.message.includes("6014")) {
                alert("You have already bet in this round.");
            } else if (error.message.includes("6022")) {
                alert("Round is locked for betting.");
            } else if (error.message.includes("6001")) {
                alert("Round is not active.");
            } else if (error.message.includes("6007")) {
                alert("Invalid round number.");
            } else if (error.message.includes("6010")) {
                alert("Insufficient funds in escrow.");
            } else {
                alert("Failed to place bet. Please try again.");
            }
        }
    },[publicKey, getRoundPda, getEscrowPda, getUserBetPda, program, configPda, fetchUserBets]);

    const handleClaimPayout = async (roundId: number) => {
        if (!publicKey) {
            alert("Please connect your wallet.");
            return;
        }

        try {
            const roundPda = getRoundPda(roundId);
            const escrowPda = getEscrowPda(roundId);
            const userBetPda = getUserBetPda(publicKey, roundId);

            const tx = await program!.methods
                .claimPayout(new BN(roundId))
                .accounts({
                    config: configPda,
                    round: roundPda,
                    userBet: userBetPda,
                    user: publicKey,
                    escrow: escrowPda,
                })
                .signers([])
                .rpc();

            // const { blockhash } = await connection.getLatestBlockhash();
            // tx.recentBlockhash = blockhash;
            // tx.feePayer = publicKey;

            // const signature = await sendTransaction(tx, connection);
            // await connection.confirmTransaction(signature, "confirmed");

            console.log(`Payout claimed successfully: ${tx}`);
            alert("Payout claimed successfully!");
        } catch (error: any) {
            console.error("Claim payout failed", error);
            if (error.message.includes("6012")) {
                alert("Contract is paused.");
            } else if (error.message.includes("6006")) {
                alert("Payout already claimed.");
            } else if (error.message.includes("6003")) {
                alert("Round has not ended yet.");
            } else if (error.message.includes("6004")) {
                alert("Round has not closed yet.");
            } else if (error.message.includes("6015")) {
                alert("No rewards available for this round.");
            } else if (error.message.includes("6007")) {
                alert("Invalid round number.");
            } else if (error.message.includes("6010")) {
                alert("Insufficient funds in escrow.");
            } else {
                alert("Failed to claim payout. Please try again.");
            }
        }
    };

    useEffect(() => {
        fetchUserBets();
    }, [fetchUserBets]);

    return { handlePlaceBet, handleClaimPayout, claimableBets };
};
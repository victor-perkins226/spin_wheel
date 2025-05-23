/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
// import * as idl from "@/lib/idl.json";
import { useProgram } from "./useProgram";
import { useCallback, useEffect, useState, useMemo } from "react";
import { UserBet, ClaimableBet, UserBetAccount } from "@/types/round";
import toast from "react-hot-toast";

// Define the return type for the hook
interface SolPredictorHook {
    handlePlaceBet: (roundId: number, isBull: boolean, amount: number) => Promise<void>;
    handleClaimPayout: (roundId: number) => Promise<any>;
    fetchUserBets: () => Promise<ClaimableBet[]>;
    claimableBets: ClaimableBet[];
    userBets: UserBet[];
}

const programId = new PublicKey("AKui3UEpyUEhtnqsDChTL76DFncYx6rRqp6CSShnUm9r")

export const useSolPredictor = (): SolPredictorHook => {
    const { publicKey, connected } = useWallet();
    const { program } = useProgram();
    
    const [claimableBets, setClaimableBets] = useState<ClaimableBet[]>([]);
    const [userBets, setUserBets] = useState<UserBet[]>([]);

    // Memoize PDAs to prevent recreations
    const configPda = useMemo(() => 
        PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0],
        []
    );

    const getRoundPda = useCallback((roundNumber: number) =>
        PublicKey.findProgramAddressSync(
            [Buffer.from("round"), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
            program?.programId || programId
        )[0],
        [program?.programId]
    );

    const getEscrowPda = useCallback((roundNumber: number) =>
        PublicKey.findProgramAddressSync(
            [Buffer.from("escrow"), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
            program?.programId || programId
        )[0],
        [program?.programId]
    );

    const getUserBetPda = useCallback((user: PublicKey, roundNumber: number) =>
        PublicKey.findProgramAddressSync(
            [Buffer.from("user_bet"), user.toBuffer(), new BN(roundNumber).toArrayLike(Buffer, "le", 8)],
            program?.programId || programId
        )[0],
        [program?.programId]
    );

    // Memoize the key dependencies for fetchUserBets
    const fetchDependencies = useMemo(() => ({
        publicKey: publicKey?.toBase58(),
        connected,
        programId: program?.programId?.toBase58()
    }), [publicKey, connected, program?.programId]);

    const fetchUserBets = useCallback(async () => {
        if (!publicKey || !connected || !program) {
            console.log('Cannot fetch bets: wallet not connected or program not initialized');
            setClaimableBets([]);
            setUserBets([]);
            return [];
        }

        try {
            const userBetAccounts = await program.account.userBet.all([
                {
                    memcmp: {
                        offset: 8,
                        bytes: publicKey.toBase58(),
                    },
                },
            ]) as unknown as { publicKey: PublicKey; account: UserBetAccount }[];

            const bets: UserBet[] = await Promise.all(
                userBetAccounts.map(async (account) => {
                    const roundNumber = account.account.roundNumber.toNumber();
                    const predictBull = account.account.predictBull;
                    const amount = account.account.amount.toNumber() / LAMPORTS_PER_SOL;
                    const claimed = account.account.claimed;

                    const [userBetPda] = PublicKey.findProgramAddressSync(
                        [Buffer.from('user_bet'), publicKey.toBuffer(), new BN(roundNumber).toArrayLike(Buffer, 'le', 8)],
                        programId
                    );

                    let status: UserBet['status'] = 'PENDING';
                    let payout = 0;

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
                            status = isCorrect ? (claimed ? 'CLAIMED' : 'WON') : 'LOST';
                            if (isCorrect && Number(round.rewardBaseCalAmount) > 0) {
                                payout = (amount * Number(round.rewardAmount)) / Number(round.rewardBaseCalAmount);
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch round ${roundNumber} for status:`, error);
                    }

                    return {
                        id: userBetPda.toBase58(),
                        roundId: roundNumber,
                        direction: predictBull ? 'up' : 'down',
                        status,
                        amount,
                        payout,
                    };
                })
            );

            const claimable: ClaimableBet[] = bets
                .filter((bet) => bet.status === 'WON')
                .map((bet) => ({
                    roundNumber: bet.roundId,
                    amount: bet.amount,
                    predictBull: bet.direction === 'up',
                    payout: bet.payout,
                }));

            setUserBets(bets);
            setClaimableBets(claimable);
            return claimable;
        } catch (error) {
            console.error('Failed to fetch user bets:', error);
            setClaimableBets([]);
            setUserBets([]);
            return [];
        }
    }, [fetchDependencies.publicKey, fetchDependencies.connected, fetchDependencies.programId, program]);

    const handlePlaceBet = useCallback(async (roundId: number, isBull: boolean, amount: number) => {
        if (!publicKey) {
            toast("Please connect your wallet.");
            return;
        }

        if (amount <= 0) {
            toast("Please enter a valid bet amount.");
            return;
        }

        try {
            const roundPda = getRoundPda(roundId);
            const escrowPda = getEscrowPda(roundId);
            const userBetPda = getUserBetPda(publicKey, roundId);

            const lamports = amount * 1_000_000_000;

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

            console.log(`Bet placed successfully: ${tx}`);
            toast("Bet placed successfully!");
        } catch (error: any) {
            console.error("Place bet failed", error);
            if (error.message.includes("6012")) {
                toast("Contract is paused.");
            } else if (error.message.includes("6013")) {
                toast("Bet amount must be at least 0.1 SOL.");
            } else if (error.message.includes("6014")) {
                toast("You have already bet in this round.");
            } else if (error.message.includes("6022")) {
                toast("Round is locked for betting.");
            } else if (error.message.includes("6001")) {
                toast("Round is not active.");
            } else if (error.message.includes("6007")) {
                toast("Invalid round number.");
            } else if (error.message.includes("6010")) {
                toast("Insufficient funds in escrow.");
            } else {
                toast("Failed to place bet. Please try again.");
            }
        }
    }, [publicKey, getRoundPda, getEscrowPda, getUserBetPda, program, configPda, fetchUserBets]);

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

    // Only fetch when the stable dependencies actually change
    useEffect(() => {
        if (fetchDependencies.publicKey && fetchDependencies.connected && fetchDependencies.programId) {
            fetchUserBets();
        } else {
            console.log('Skipping fetchUserBets: wallet not connected or program not initialized');
            setClaimableBets([]);
            setUserBets([]);
        }
    }, [fetchDependencies.publicKey, fetchDependencies.connected, fetchDependencies.programId, fetchUserBets]);

    return { handlePlaceBet, handleClaimPayout, claimableBets, userBets, fetchUserBets };
};
'use client'

import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
// import * as idl from "@/lib/idl.json";
import { useProgram } from "./useProgram";

// Define the return type for the hook
interface SolPredictorHook {
    handlePlaceBet: (roundId: number, isBull: boolean, amount: number) => Promise<void>;
    handleClaimPayout: (roundId: number) => Promise<void>;
}

const programId = new PublicKey("CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT")

export const useSolPredictor = (): SolPredictorHook => {
    const { publicKey } = useWallet();
    const { program } = useProgram();

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

    const handlePlaceBet = async (roundId: number, isBull: boolean, amount: number) => {
        if (!publicKey) {
            alert("Please connect your wallet.");
            return;
        }

        // const round = rounds.find((r: any) => parseInt(r.number) === roundId);
        // if (!round || !round.canBet) {
        //     alert("Betting is not available for this round.");
        //     return;
        // }

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
    };

    const handleClaimPayout = async (roundId: number) => {
        if (!publicKey) {
            alert("Please connect your wallet.");
            return;
        }

        // const round = rounds.find((r: any) => parseInt(r.number) === roundId);
        // if (!round) {
        //     alert("Invalid round.");
        //     return;
        // }

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

    return { handlePlaceBet, handleClaimPayout };
};
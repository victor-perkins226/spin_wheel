import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionSignature,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import idl from "../lib/idl.json";
import toast from "react-hot-toast";

// place bet
export async function placeBet(
  connection: Connection,
  programId: PublicKey,
  contractAddress: PublicKey,
  userPubkey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  sendTransaction: any, // Not used but kept for compatibility
  roundId: number,
  direction: string,
  amount: number
): Promise<string | null> {
  try {
    console.log("🔁 placeBet called with:", {
      programId: programId.toBase58(),
      contractAddress: contractAddress.toBase58(),
      userPubkey: userPubkey.toBase58(),
      roundId,
      direction,
      amount,
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    const getRoundPda = (roundNumber: number) =>
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("round"),
          new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8),
        ],
        programId
      )[0];

    const getEscrowPda = (roundNumber: number) =>
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8),
        ],
        programId
      )[0];
    const getUserBetPda = (user: PublicKey, roundNumber: number) =>
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_bet"),
          user.toBuffer(),
          new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8),
        ],
        programId
      )[0];

    const provider = new anchor.AnchorProvider(
      connection,
      { publicKey: userPubkey, signTransaction } as any,
      { commitment: "confirmed" }
    );

    const program = new anchor.Program(idl as any, programId, provider);

    const betAmount = new anchor.BN(amount * LAMPORTS_PER_SOL);
    console.log("💰 Lamports to transfer:", betAmount.toString());

    const roundPda = getRoundPda(roundId);
    const escrowPda = getEscrowPda(roundId);
    const userBetPda = getUserBetPda(userPubkey, roundId);

    console.log(configPda, "config pda");
    console.log(roundPda, "roundPda");

    let isBull = false;

    const tx = await program.methods
      .placeBet(
        new anchor.BN(amount * anchor.web3.LAMPORTS_PER_SOL),
        isBull,
        new anchor.BN(roundId)
      )
      .accounts({
        config: configPda,
        round: roundPda,
        userBet: userBetPda,
        user: userPubkey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    console.log("====================================");
    console.log(tx, "tx");
    console.log("====================================");

    // Get fresh blockhash with lastValidBlockHeight for better confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;

    const signedTx = await signTransaction(tx);
    
    try {
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "processed",
        }
      );

      // Use the new confirmation method with block height
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, "confirmed");

      console.log("✅ Bet placed successfully. Tx Signature:", signature);
      return signature;
    } catch (sendError: any) {
      // Handle specific duplicate transaction error
      if (sendError.message?.includes("This transaction has already been processed")) {
        console.log("Transaction already processed, checking if it was successful");
        // toast("Transaction already processed. Please check your bets.");
        return null;
      }
      throw sendError;
    }

  } catch (error: any) {
    console.error("❌ Error in placeBet:", error);
    
    // Handle duplicate transaction specifically
    if (error.message?.includes("This transaction has already been processed")) {
      console.log("Transaction already processed, treating as potential success");
      return null;
    }
    
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

// claim payout
export async function claimPayout(
  connection: Connection,
  programId: PublicKey,
  contractAddress: PublicKey,
  userPubkey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  sendTransaction: any, // Not used but kept for compatibility
  roundId: number
): Promise<void> {
  try {
    console.log("🔁 claimRewards called with:", {
      programId: programId.toBase58(),
      contractAddress: contractAddress.toBase58(),
      userPubkey: userPubkey.toBase58(),
      roundId: roundId,
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    console.log(configPda, "config pda");

    const getRoundPda = (roundNumber: number) =>
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("round"),
          new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8),
        ],
        programId
      )[0];

    const getEscrowPda = (roundNumber: number) =>
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8),
        ],
        programId
      )[0];
    const getUserBetPda = (user: PublicKey, roundNumber: number) =>
      PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_bet"),
          user.toBuffer(),
          new anchor.BN(roundNumber).toArrayLike(Buffer, "le", 8),
        ],
        programId
      )[0];

    const provider = new anchor.AnchorProvider(
      connection,
      { publicKey: userPubkey, signTransaction } as any,
      { commitment: "confirmed" }
    );

    const program = new anchor.Program(idl as any, programId, provider);

    const roundPda = getRoundPda(roundId);
    const escrowPda = getEscrowPda(roundId);
    const userBetPda = getUserBetPda(userPubkey, roundId);

    const tx = await program.methods
      .claimPayout(new anchor.BN(roundId))
      .accounts({
        config: configPda,
        round: roundPda,
        userBet: userBetPda,
        user: userPubkey,
        escrow: escrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();

    console.log("====================================");
    console.log(tx, "tx claim payout");
    console.log("====================================");

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;

    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(
      signedTx.serialize(),
      {
        preflightCommitment: "processed",
      }
    );

    await connection.confirmTransaction(signature, "confirmed");

    console.log("✅ Claim payout successful. Tx Signature:", signature);
  } catch (error: any) {
    console.error("❌ Error in claimRewards:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}



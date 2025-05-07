import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import idl from "../lib/idl.json"; // Adjust the path accordingly

// place bet
export async function placeBet(
  connection,
  programId,
  contractAddress,
  userPubkey,
  signTransaction,
  sendTransaction,
  roundId,
  direction,
  amount
) {
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
      { userPubkey, signTransaction } as any,
      { commitment: "confirmed" }
    );

    const program = new anchor.Program(idl as any, programId, provider);

    const betAmount = new anchor.BN(amount * LAMPORTS_PER_SOL);
    console.log("💰 Lamports to transfer:", betAmount.toString());

    const roundPda = getRoundPda(roundId);
    const escrowPda = getEscrowPda(roundId);
    const userBetPda = getUserBetPda(userPubkey, roundId);

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

    console.log("✅ Bet placed successfully. Tx Signature:", signature);

    return signature;
  } catch (error) {
    console.error("❌ Error in placeBet:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

// claim payout
export async function claimPayout(
  connection,
  programId,
  contractAddress,
  userPubkey,
  signTransaction,
  sendTransaction,
  roundId
) {
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
      { userPubkey, signTransaction } as any,
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

    console.log("✅ Bet placed successfully. Tx Signature:", signature);
  } catch (error) {
    console.error("❌ Error in claimRewards:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}



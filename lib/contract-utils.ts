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


    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      programId
    );
    const roundPda = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), new anchor.BN(roundId).toArrayLike(Buffer, "le", 8)],
      programId
    )[0];
    const userBetPda = PublicKey.findProgramAddressSync(
      [Buffer.from("user_bet"), userPubkey.toBuffer(), new anchor.BN(roundId).toArrayLike(Buffer, "le", 8)],
      programId
    )[0];

    const provider = new anchor.AnchorProvider(
      connection,
      { publicKey: userPubkey, signTransaction } as any,
      { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl as any, programId, provider);

    const tx = await program.methods
      .placeBet(
        new anchor.BN(amount * LAMPORTS_PER_SOL),
        direction === "bull",
        new anchor.BN(roundId)
      )
      .accounts({
        config: configPda,
        round: roundPda,
        userBet: userBetPda,
        user: userPubkey,
        treasury: treasuryPda,              // ← use treasury here
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .transaction();
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

      return signature;
    } catch (sendError: any) {
      // Handle specific duplicate transaction error
      if (sendError.message?.includes("This transaction has already been processed")) {
        return null;
      }
      throw sendError;
    }

  } catch (error: any) {
    console.error("❌ Error in placeBet:", error);

    // Handle duplicate transaction specifically
    if (error.message?.includes("This transaction has already been processed")) {
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


    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      programId
    );
    const roundPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    )[0];
    const userBetPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        userPubkey.toBuffer(),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    )[0];

    // 2. Build an Anchor provider & program client
    const provider = new anchor.AnchorProvider(
      connection,
      { publicKey: userPubkey, signTransaction } as any,
      { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl as any, programId, provider);

    // 3. Create the claimPayout instruction, with exactly the same accounts your tests use
    const tx = await program.methods
      .claimPayout(new anchor.BN(roundId))
      .accounts({
        config: configPda,
        round: roundPda,
        userBet: userBetPda,
        user: userPubkey,
        treasury: treasuryPda,
      })
      .transaction();


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

  } catch (error: any) {
    console.error("❌ Error in claimRewards:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}



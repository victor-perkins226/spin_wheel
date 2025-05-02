import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import idl from "../lib/idl.json"; // Adjust the path accordingly

/**
 * Initialize the prediction contract
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} programId - Program ID
 * @param {PublicKey} adminPubkey - Admin wallet public key
 * @param {Function} signTransaction - Transaction signing function
 * @param {number} roundDuration - Duration of each round in seconds
 * @param {number} minBetAmount - Minimum bet amount in SOL
 * @param {number} treasuryFee - Treasury fee in basis points (e.g., 500 = 5%)
 * @param {number} lockDuration - Duration of lock period in seconds
 * @param {number} bufferSeconds - Buffer time in seconds
 * @param {PublicKey} executorPubkey - Executor wallet public key
 * @param {PublicKey[]} adminSigners - Array of admin multisig signers
 * @param {PublicKey[]} operatorSigners - Array of operator multisig signers
 * @param {number} threshold - Number of required signatures
 */
export async function initialize(
  connection,
  programId,
  adminPubkey,
  signTransaction,
  roundDuration,
  minBetAmount,
  treasuryFee,
  lockDuration,
  bufferSeconds,
  executorPubkey,
  adminSigners,
  operatorSigners,
  threshold
) {
  try {
    console.log("🔁 initialize called with:", {
      programId: programId.toBase58(),
      adminPubkey: adminPubkey.toBase58(),
      roundDuration,
      minBetAmount,
      treasuryFee,
      lockDuration,
      bufferSeconds,
      executorPubkey: executorPubkey.toBase58(),
      adminSigners: adminSigners.map(pk => pk.toBase58()),
      operatorSigners: operatorSigners.map(pk => pk.toBase58()),
      threshold,
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      programId
    );
    const [adminMultisigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("adminmultisig")],
      programId
    );
    const [operatorMultisigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("operatormultisig")],
      programId
    );

    console.log("📦 Derived PDAs:", {
      configPda: configPda.toBase58(),
      treasuryPda: treasuryPda.toBase58(),
      adminMultisigPda: adminMultisigPda.toBase58(),
      operatorMultisigPda: operatorMultisigPda.toBase58(),
    });

    // Wallet adapter object compatible with Anchor
    const wallet = {
      publicKey: adminPubkey,
      signTransaction,
      signAllTransactions: async (txs) => Promise.all(txs.map(signTransaction)),
    };

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    anchor.setProvider(provider);
    const program = new anchor.Program(idl, programId, provider);

    // Run the instruction
    const txSig = await program.methods
      .initialize(
        new anchor.BN(roundDuration),
        new anchor.BN(minBetAmount),
        new anchor.BN(treasuryFee),
        new anchor.BN(lockDuration),
        new anchor.BN(bufferSeconds),
        executorPubkey,
        adminSigners,
        operatorSigners,
        threshold
      )
      .accounts({
        config: configPda,
        treasury: treasuryPda,
        adminMultisig: adminMultisigPda,
        operatorMultisig: operatorMultisigPda,
        admin: adminPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Contract initialized successfully. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in initialize:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

/**
 * Place a bet on a prediction round
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} programId - Program ID
 * @param {PublicKey} contractAddress - Contract address
 * @param {PublicKey} userPubkey - User wallet public key
 * @param {Function} signTransaction - Transaction signing function
 * @param {number} roundId - Round ID
 * @param {string} direction - Prediction direction ("up" or "down")
 * @param {number} amount - Bet amount in SOL
 */
export async function placeBet(
  connection,
  programId,
  contractAddress,
  userPubkey,
  signTransaction,
  roundId,
  direction,
  amount
) {

  console.log('====================================');
  console.log(roundId,'round id');
  console.log('====================================');
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
    
    console.log('====================================');
    console.log(configPda.toBase58(), "config pda");
    console.log('====================================');

    // Derive Round PDA
    const [roundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      programId
    );
    
    console.log("📦 Derived round PDA:", roundPda.toBase58());

    // Derive UserBet PDA
    const [userBetPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        userPubkey.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8)
      ],
      programId
    );
    
    console.log("📦 Derived userBet PDA:", userBetPda.toBase58());

    // Derive Escrow PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      programId
    );
    
    console.log("📦 Derived escrow PDA:", escrowPda.toBase58());

    // Wallet adapter object compatible with Anchor
    const wallet = {
      publicKey: userPubkey,
      signTransaction,
      signAllTransactions: async (txs) => Promise.all(txs.map(signTransaction)),
    };

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    anchor.setProvider(provider);
    const program = new anchor.Program(idl, programId, provider);

    console.log("====================================");
    console.log("program ready");
    console.log("====================================");

    const betAmount = new anchor.BN(amount * LAMPORTS_PER_SOL);
    console.log("💰 Lamports to transfer:", betAmount.toString());

    // Run the instruction
    const txSig = await program.methods
      .placeBet(
        betAmount,
        direction === "up", // predictBull - true if predicting price will go up
        new anchor.BN(1)
      )
      .accounts({
        config: configPda,
        round: roundPda,
        userBet: userBetPda,
        user: userPubkey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Bet placed successfully. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in placeBet:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

/**
 * Anchor-based Claim Rewards function
 */
export async function claimRewards(
  connection,
  programId,
  contractAddress,
  userPubkey,
  signTransaction,
  idl
) {
  try {
    console.log("🔁 claimRewards called with:", {
      programId: programId.toBase58(),
      contractAddress: contractAddress.toBase58(),
      userPubkey: userPubkey.toBase58(),
    });

    const wallet = {
      publicKey: userPubkey,
      signTransaction,
      signAllTransactions: async (txs) => Promise.all(txs.map(signTransaction)),
    };

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    anchor.setProvider(provider);

    const program = new anchor.Program(idl, programId, provider);

    const txSig = await program.methods
      .claimRewards()
      .accounts({
        user: userPubkey,
        contract: contractAddress,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Rewards claimed. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in claimRewards:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

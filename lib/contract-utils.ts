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

      console.log('====================================');
      console.log(tx,"tx");
      console.log('====================================');

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPubkey;

    const signedTx = await signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      preflightCommitment: "processed",
    });

    
    await connection.confirmTransaction(signature, "confirmed");

    console.log("✅ Bet placed successfully. Tx Signature:", signature);
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

export async function checkRoundStatus(connection, programId, roundId) {
  try {
    // Get config to find configuration parameters
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    // Create provider (read-only)
    const provider = new anchor.AnchorProvider(
      connection,
      {},
      { commitment: "confirmed" }
    );

    anchor.setProvider(provider);
    const program = new anchor.Program(idl, programId, provider);

    // Get config account
    const configAccount = await program.account.config.fetch(configPda);
    const currentRoundNumber = configAccount.currentRound.toNumber();

    console.log("=== Contract Configuration ===");
    console.log(
      `Round Duration: ${configAccount.roundDuration.toNumber()} seconds`
    );
    console.log(
      `Lock Duration: ${configAccount.lockDuration.toNumber()} seconds`
    );
    console.log(`Current Round Number: ${roundId}`);
    console.log(
      `Min Bet Amount: ${
        configAccount.minBetAmount.toNumber() / LAMPORTS_PER_SOL
      } SOL`
    );
    console.log(`Treasury Fee: ${configAccount.treasuryFee.toNumber()}%`);
    console.log("=============================");

    // Get current round details
    const [roundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    const roundAccount = await program.account.round.fetch(roundPda);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Calculate timing parameters
    const startTime = roundAccount.startTime.toNumber();
    const lockTime = roundAccount.lockTime
      ? roundAccount.lockTime.toNumber()
      : null;
    const endTime = roundAccount.endTime
      ? roundAccount.endTime.toNumber()
      : null;

    const expectedLockTime = startTime + configAccount.lockDuration.toNumber();
    const expectedEndTime = startTime + configAccount.roundDuration.toNumber();

    // Determine round state for betting
    let roundState = "Unknown";
    let canPlaceBet = false;

    if (!roundAccount.isActive) {
      roundState = "Inactive";
    } else if (lockTime && endTime) {
      roundState = "Ended";
    } else if (lockTime) {
      roundState = "Locked";
    } else if (currentTimestamp < expectedLockTime) {
      roundState = "Active - Betting Open";
      canPlaceBet = true;
    } else {
      roundState = "Active - Should Be Locked";
    }

    console.log("=== Round Status Check ===");
    console.log(`Round #: ${roundId}`);
    console.log(`Round State: ${roundState}`);
    console.log(`Can Place Bet: ${canPlaceBet ? "YES" : "NO"}`);
    console.log(`Is Active Flag: ${roundAccount.isActive}`);
    console.log(
      `Start Time: ${new Date(
        startTime * 1000
      ).toLocaleString()} (${startTime})`
    );
    console.log(
      `Current Time: ${new Date(
        currentTimestamp * 1000
      ).toLocaleString()} (${currentTimestamp})`
    );
    console.log(
      `Expected Lock Time: ${new Date(
        expectedLockTime * 1000
      ).toLocaleString()} (${expectedLockTime})`
    );
    console.log(
      `Actual Lock Time: ${
        lockTime
          ? new Date(lockTime * 1000).toLocaleString() + ` (${lockTime})`
          : "Not locked"
      }`
    );
    console.log(
      `Expected End Time: ${new Date(
        expectedEndTime * 1000
      ).toLocaleString()} (${expectedEndTime})`
    );
    console.log(
      `Actual End Time: ${
        endTime
          ? new Date(endTime * 1000).toLocaleString() + ` (${endTime})`
          : "Not ended"
      }`
    );

    // Time remaining calculations
    if (canPlaceBet) {
      const secondsUntilLock = expectedLockTime - currentTimestamp;
      console.log(
        `Time Remaining for Betting: ${secondsUntilLock} seconds (${Math.floor(
          secondsUntilLock / 60
        )} minutes)`
      );
    }

    console.log(
      `Total Amount: ${
        roundAccount.totalAmount.toNumber() / LAMPORTS_PER_SOL
      } SOL`
    );
    console.log(
      `Bull Amount: ${
        roundAccount.totalBullAmount.toNumber() / LAMPORTS_PER_SOL
      } SOL`
    );
    console.log(
      `Bear Amount: ${
        roundAccount.totalBearAmount.toNumber() / LAMPORTS_PER_SOL
      } SOL`
    );
    console.log("=========================");

    return {
      config: {
        roundDuration: configAccount.roundDuration.toNumber(),
        lockDuration: configAccount.lockDuration.toNumber(),
        minBetAmount: configAccount.minBetAmount.toNumber(),
        treasuryFee: configAccount.treasuryFee.toNumber(),
      },
      round: {
        roundNumber: 1,
        state: roundState,
        canPlaceBet,
        isActive: roundAccount.isActive,
        startTime,
        lockTime,
        endTime,
        expectedLockTime,
        expectedEndTime,
        currentTimestamp,
        totalAmount: roundAccount.totalAmount.toNumber(),
        totalBullAmount: roundAccount.totalBullAmount.toNumber(),
        totalBearAmount: roundAccount.totalBearAmount.toNumber(),
      },
    };
  } catch (error) {
    console.error("Failed to check detailed round status:", error);
    throw error;
  }
}

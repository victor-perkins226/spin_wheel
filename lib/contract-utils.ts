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

    // Derive UserBet PDA
    const [userBetPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        userPubkey.toBuffer(),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    console.log("📦 Derived userBet PDA:", userBetPda.toBase58());

    // Derive Escrow PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
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

    const config = await program.account.config.fetch(configPda);
    const currentRound = config.currentRound;

    // Derive Round PDA
    const [roundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), currentRound.toArrayLike(Buffer, "le", 8)],
      programId
    );

    const betAmount = new anchor.BN(amount * LAMPORTS_PER_SOL);
    console.log("💰 Lamports to transfer:", betAmount.toString());

    const configData = await program.account.config.fetch(configPda);

    console.log("====================================");
    console.log(configData, "config data");
    console.log("====================================");

    const roundData = await program.account.round.fetch(roundPda);
    const now = Math.floor(Date.now() / 1000);

    const isLocked = now >= roundData.lockTime.toNumber();

    console.log("====================================");
    console.log(isLocked, "isLocked");
    console.log("====================================");

    console.log("====================================");
    console.log(roundData, "round data");
    console.log("====================================");


    const startTimestamp = roundData.startTime.toNumber();
const startDate = new Date(startTimestamp * 1000); // Convert to milliseconds

// Format the date (e.g., "2025-05-04 13:45:00")
const formattedStartTime = startDate.toLocaleString("en-IN", {
  timeZone: "Asia/Kolkata", // Optional: set your timezone
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

console.log("📅 Round starts at:", formattedStartTime);


    if (!roundData.isActive) {
      throw new Error("No active round for betting.");
    }

    if (!roundData?.isLocked) {
      throw new Error("Round is locked for betting.");
    }


    // Run the instruction
    const txSig = await program.methods
      .placeBet(
        betAmount,
        direction === "up", // predictBull - true if predicting price will go up
        new anchor.BN(roundId)
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

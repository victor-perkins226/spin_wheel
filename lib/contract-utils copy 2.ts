// Import required libraries
import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import idl from "../lib/idl.json"; // Adjust path as needed

/**
 * Initialize the prediction contract
 */
export async function initialize(
  connection,
  programId,
  signTransaction,
  roundDuration,
  minBetAmount,
  treasuryFee,
  lockDuration,
  bufferSeconds,
  threshold
) {
  try {
    console.log("🔁 initialize called with:", {
      programId: programId.toBase58(),
      roundDuration,
      minBetAmount,
      treasuryFee,
      lockDuration,
      bufferSeconds,
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
        admin: programId,
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
 * Start the genesis round (first round)
 */
export async function startGenesisRound(
  connection,
  programId,
  executorPubkey,
  signTransaction
) {
  try {
    console.log("🔁 startGenesisRound called with:", {
      programId: programId.toBase58(),
      executorPubkey: executorPubkey.toBase58(),
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    // Derive Round 1 PDA
    const [round1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      programId
    );

    // Derive Escrow 1 PDA
    const [escrow1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      programId
    );

    console.log("📦 Derived PDAs:", {
      configPda: configPda.toBase58(),
      round1Pda: round1Pda.toBase58(),
      escrow1Pda: escrow1Pda.toBase58(),
    });

    // Wallet adapter object compatible with Anchor
    const wallet = {
      publicKey: executorPubkey,
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
      .startGenesisRound()
      .accounts({
        config: configPda,
        round: round1Pda,
        escrow: escrow1Pda,
        executor: executorPubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Genesis round started successfully. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in startGenesisRound:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

/**
 * Place a bet on a prediction round
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

    console.log("Config PDA:", configPda.toBase58());

    // Derive Round PDA - Using the provided roundId
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
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
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

    console.log("Program ready");

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
 * Lock the current round and prepare the next round
 * Requires Pyth oracle integration
 */
export async function lockRound(
  connection,
  programId,
  executorPubkey,
  signTransaction,
  roundId,
  pythReceiver,
  hermesClient,
  priceFeeds
) {
  try {
    console.log("🔁 lockRound called with:", {
      programId: programId.toBase58(),
      executorPubkey: executorPubkey.toBase58(),
      roundId,
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    // Derive current Round PDA
    const [roundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive next Round PDA
    const [nextRoundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(roundId + 1).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive next Escrow PDA
    const [nextEscrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        new anchor.BN(roundId + 1).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    console.log("📦 Derived PDAs:", {
      configPda: configPda.toBase58(),
      roundPda: roundPda.toBase58(),
      nextRoundPda: nextRoundPda.toBase58(),
      nextEscrowPda: nextEscrowPda.toBase58(),
    });

    // Get latest price updates from Hermes
    const priceUpdateData = await hermesClient.getLatestPriceUpdates(
      priceFeeds,
      { encoding: "base64" }
    );

    // Build transaction with Pyth price update
    const builder = pythReceiver.newTransactionBuilder({
      closeUpdateAccounts: false,
    });
    await builder.addPostPriceUpdates(priceUpdateData.binary.data);

    // Add consumer instruction for locking the round
    await builder.addPriceConsumerInstructions(
      async (getPriceUpdateAccount) => {
        // Create the wallet for Anchor
        const wallet = {
          publicKey: executorPubkey,
          signTransaction,
          signAllTransactions: async (txs) =>
            Promise.all(txs.map(signTransaction)),
        };

        const provider = new anchor.AnchorProvider(connection, wallet, {
          commitment: "confirmed",
        });

        anchor.setProvider(provider);
        const program = new anchor.Program(idl, programId, provider);

        // Create the instruction
        return [
          {
            instruction: await program.methods
              .lockRound()
              .accounts({
                config: configPda,
                round: roundPda,
                nextRound: nextRoundPda,
                nextEscrow: nextEscrowPda,
                executor: executorPubkey,
                pythPrice: getPriceUpdateAccount(priceFeeds[0]),
                systemProgram: SystemProgram.programId,
              })
              .instruction(),
            signers: [],
          },
        ];
      }
    );

    // Build and send the transaction
    const txs = await builder.buildVersionedTransactions({
      computeUnitPriceMicroLamports: 100000,
      tightComputeBudget: false,
    });

    // Using the sendTransactions function from @pythnetwork/solana-utils
    const txSig = await pythReceiver.wallet.sendAll(txs);

    console.log("✅ Round locked successfully. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in lockRound:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

/**
 * End the current round and start a new one
 * Requires Pyth oracle integration
 */
export async function endAndStartRound(
  connection,
  programId,
  executorPubkey,
  signTransaction,
  previousRoundId,
  currentRoundId,
  pythReceiver,
  hermesClient,
  priceFeeds
) {
  try {
    console.log("🔁 endAndStartRound called with:", {
      programId: programId.toBase58(),
      executorPubkey: executorPubkey.toBase58(),
      previousRoundId,
      currentRoundId,
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    // Derive previous Round PDA
    const [previousRoundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(previousRoundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive current Round PDA
    const [currentRoundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(currentRoundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive new Round PDA
    const [newRoundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(currentRoundId + 1).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive previous Escrow PDA
    const [previousEscrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        new anchor.BN(previousRoundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive new Escrow PDA
    const [newEscrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        new anchor.BN(currentRoundId + 1).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Derive treasury PDA
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      programId
    );

    console.log("📦 Derived PDAs:", {
      configPda: configPda.toBase58(),
      previousRoundPda: previousRoundPda.toBase58(),
      currentRoundPda: currentRoundPda.toBase58(),
      newRoundPda: newRoundPda.toBase58(),
      previousEscrowPda: previousEscrowPda.toBase58(),
      newEscrowPda: newEscrowPda.toBase58(),
      treasuryPda: treasuryPda.toBase58(),
    });

    // Get latest price updates from Hermes
    const priceUpdateData = await hermesClient.getLatestPriceUpdates(
      priceFeeds,
      { encoding: "base64" }
    );

    // Build transaction with Pyth price update
    const builder = pythReceiver.newTransactionBuilder({
      closeUpdateAccounts: false,
    });
    await builder.addPostPriceUpdates(priceUpdateData.binary.data);

    // Add consumer instruction for ending and starting rounds
    await builder.addPriceConsumerInstructions(
      async (getPriceUpdateAccount) => {
        // Create the wallet for Anchor
        const wallet = {
          publicKey: executorPubkey,
          signTransaction,
          signAllTransactions: async (txs) =>
            Promise.all(txs.map(signTransaction)),
        };

        const provider = new anchor.AnchorProvider(connection, wallet, {
          commitment: "confirmed",
        });

        anchor.setProvider(provider);
        const program = new anchor.Program(idl, programId, provider);

        // Create the instruction
        return [
          {
            instruction: await program.methods
              .endAndStartRound()
              .accounts({
                config: configPda,
                previousRound: previousRoundPda,
                currentRound: currentRoundPda,
                newRound: newRoundPda,
                previousEscrow: previousEscrowPda,
                newEscrow: newEscrowPda,
                treasury: treasuryPda,
                executor: executorPubkey,
                pythPrice: getPriceUpdateAccount(priceFeeds[0]),
                systemProgram: SystemProgram.programId,
              })
              .instruction(),
            signers: [],
          },
        ];
      }
    );

    // Build and send the transaction
    const txs = await builder.buildVersionedTransactions({
      computeUnitPriceMicroLamports: 1000000,
      tightComputeBudget: false,
    });

    // Using the sendTransactions function from @pythnetwork/solana-utils
    const txSig = await pythReceiver.wallet.sendAll(txs);

    console.log("✅ Round ended and new round started. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in endAndStartRound:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

/**
 * Claim payout for a winning bet
 */
export async function claimPayout(
  connection,
  programId,
  userPubkey,
  signTransaction,
  roundId
) {
  try {
    console.log("🔁 claimPayout called with:", {
      programId: programId.toBase58(),
      userPubkey: userPubkey.toBase58(),
      roundId,
    });

    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    // Derive Round PDA
    const [roundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
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

    // Derive Escrow PDA
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    console.log("📦 Derived PDAs:", {
      configPda: configPda.toBase58(),
      roundPda: roundPda.toBase58(),
      userBetPda: userBetPda.toBase58(),
      escrowPda: escrowPda.toBase58(),
    });

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

    // Run the instruction
    const txSig = await program.methods
      .claimPayout(new anchor.BN(roundId))
      .accounts({
        config: configPda,
        round: roundPda,
        userBet: userBetPda,
        user: userPubkey,
        escrow: escrowPda,
      })
      .rpc();

    console.log("✅ Payout claimed successfully. Tx Signature:", txSig);
    return txSig;
  } catch (error) {
    console.error("❌ Error in claimPayout:", error);
    if (error.logs) console.error("🔍 Anchor logs:\n", error.logs.join("\n"));
    throw error;
  }
}

/**
 * Get current round information
 */
export async function getCurrentRoundInfo(connection, programId) {
  try {
    console.log("🔁 getCurrentRoundInfo called with:", {
      programId: programId.toBase58(),
    });

    // Create provider (read-only)
    const provider = new anchor.AnchorProvider(
      connection,
      {},
      {
        commitment: "confirmed",
      }
    );

    anchor.setProvider(provider);
    const program = new anchor.Program(idl, programId, provider);

    // Get config to find current round number
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      programId
    );

    const configAccount = await program.account.config.fetch(configPda);
    const currentRoundNumber = configAccount.currentRound.toNumber();

    console.log("📊 Current round number:", currentRoundNumber);

    // Get current round details
    const [roundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(currentRoundNumber).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    const roundAccount = await program.account.round.fetch(roundPda);

    return {
      roundNumber: currentRoundNumber,
      isActive: roundAccount.isActive,
      startTime: roundAccount.startTime.toNumber(),
      lockTime: roundAccount.lockTime ? roundAccount.lockTime.toNumber() : null,
      endTime: roundAccount.endTime ? roundAccount.endTime.toNumber() : null,
      startPrice: roundAccount.startPrice
        ? roundAccount.startPrice.toNumber()
        : null,
      lockPrice: roundAccount.lockPrice
        ? roundAccount.lockPrice.toNumber()
        : null,
      endPrice: roundAccount.endPrice ? roundAccount.endPrice.toNumber() : null,
      totalAmount: roundAccount.totalAmount.toNumber(),
      totalBullAmount: roundAccount.totalBullAmount.toNumber(),
      totalBearAmount: roundAccount.totalBearAmount.toNumber(),
    };
  } catch (error) {
    console.error("❌ Error in getCurrentRoundInfo:", error);
    throw error;
  }
}

/**
 * Get user bet information for a specific round
 */
export async function getUserBetInfo(
  connection,
  programId,
  userPubkey,
  roundId
) {
  try {
    console.log("🔁 getUserBetInfo called with:", {
      programId: programId.toBase58(),
      userPubkey: userPubkey.toBase58(),
      roundId,
    });

    // Create provider (read-only)
    const provider = new anchor.AnchorProvider(
      connection,
      {},
      {
        commitment: "confirmed",
      }
    );

    anchor.setProvider(provider);
    const program = new anchor.Program(idl, programId, provider);

    // Derive UserBet PDA
    const [userBetPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        userPubkey.toBuffer(),
        new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    // Try to fetch the user bet account
    try {
      const userBetAccount = await program.account.userBet.fetch(userBetPda);

      return {
        exists: true,
        roundId: userBetAccount.roundId.toNumber(),
        amount: userBetAccount.amount.toNumber(),
        predictBull: userBetAccount.predictBull,
        claimed: userBetAccount.claimed,
      };
    } catch (err) {
      // If account doesn't exist or any other error
      return {
        exists: false,
      };
    }
  } catch (error) {
    console.error("❌ Error in getUserBetInfo:", error);
    throw error;
  }
}

/**
 * Main function to execute the complete prediction workflow
 */
/**
 * Main function to execute the complete prediction workflow
 * including placing a bet on an active round
 */
/**
 * Main function to execute the complete prediction workflow
 * including placing a bet on an active round
 */
export async function executePredictionWorkflow(
  connection,
  programId,
  contractAddress,
  userPubkey,
  signTransaction,
  roundId = null,
  direction = "up",
  amount = 0.1,
  executorPubkey = null  // Added executorPubkey parameter for starting rounds
) {
  try {
    console.log("🚀 Starting prediction contract workflow...");

    // Ensure we have required parameters
    if (!connection) throw new Error("Connection is required");
    if (!programId) throw new Error("Program ID is required");
    if (!userPubkey) throw new Error("User public key is required");
    if (!signTransaction) throw new Error("Sign transaction function is required");
    
    // Default values for optional parameters
    // roundId will be determined from the current round if not provided
    // Default direction is "up" and amount is 0.1 SOL if not provided

    // Step 1: Check if contract is already initialized
    let isInitialized = false;
    let configAccount = null;
    try {
      const [configPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
      );

      // Create a wallet adapter compatible with Anchor for checking config
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

      configAccount = await program.account.config.fetch(configPda);
      isInitialized = true;
      console.log("✅ Contract is already initialized");
    } catch (error) {
      console.log(
        "Contract not initialized yet. You must initialize it first."
      );
      throw new Error("Contract must be initialized before placing bets.");
    }

    // Step 2: Check for active rounds and start genesis round if needed
    let roundInfo;
    let isActiveRoundAvailable = false;
    
    try {
      roundInfo = await getCurrentRoundInfo(connection, programId);
      console.log("Current round info:", roundInfo);
      
      // Check if the round is TRULY active
      // A round is active when it's not locked or ended yet (within lockDuration/roundDuration)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const roundStartTime = roundInfo.startTime;
      
      if (roundInfo.isActive && 
          !roundInfo.lockTime && 
          !roundInfo.endTime && 
          currentTimestamp < (roundStartTime + configAccount.lockDuration.toNumber())) {
        isActiveRoundAvailable = true;
        console.log("✅ Found truly active round that can accept bets");
      } else {
        console.log("❌ Round exists but is not in active betting state");
        
        // If the round is locked or ended, we might need a new round
        if (roundInfo.lockTime || roundInfo.endTime) {
          console.log("Round is locked or ended, may need to start a new round");
          isActiveRoundAvailable = false;
        }
      }
    } catch (error) {
      console.log("No round exists yet. Need to start genesis round.");
      isActiveRoundAvailable = false;
    }

    console.log(executorPubkey,'executor pub key');
    

    // If no active round, try to start genesis round if executor is provided
    if (!isActiveRoundAvailable && executorPubkey) {
      try {
        console.log("Step 2b: Starting genesis round...");
        await startGenesisRound(
          connection,
          programId,
          executorPubkey,
          signTransaction
        );
        
        // Get updated round info after starting genesis
        roundInfo = await getCurrentRoundInfo(connection, programId);
        console.log("Updated round info after genesis:", roundInfo);
        isActiveRoundAvailable = true;
      } catch (error) {
        console.error("Failed to start genesis round:", error);
        throw new Error("Failed to start genesis round: " + error.message);
      }
    } else if (!isActiveRoundAvailable) {
      throw new Error(
        "No active round available for betting. Please provide executor public key to start a round."
      );
    }

    console.log(`Active round confirmed: Round #${roundInfo.roundNumber}`);
    
    // Use the current round number if roundId is not provided
    const targetRoundId = roundId || roundInfo.roundNumber;
    
    // Step 3: Place the bet on the active round
    console.log(`Step 3: Placing a ${direction} bet of ${amount} SOL on round #${targetRoundId}...`);
    
    const betTxSig = await placeBet(
      connection,
      programId,
      contractAddress || programId, // Use programId as contractAddress if not provided
      userPubkey,
      signTransaction,
      targetRoundId,
      direction,
      amount
    );
    
    // Step 4: Get the user's bet information to confirm
    const userBetInfo = await getUserBetInfo(
      connection,
      programId,
      userPubkey,
      targetRoundId
    );
    
    console.log("✅ Bet placed and confirmed:", userBetInfo);

    return {
      isInitialized,
      roundInfo,
      betTxSignature: betTxSig,
      userBetInfo
    };
  } catch (error) {
    console.error("❌ Error in executePredictionWorkflow:", error);
    console.error("Error message:", error.message);
    if (error.logs) console.error("🔍 Detailed logs:\n", error.logs.join("\n"));
    throw error;
  }
}
/**
 * Helper function for debugging round status
 */
// Debugging function to check round status
/**
 * Enhanced function for debugging round status with detailed validation
 */
export async function checkRoundStatus(connection, programId) {
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
    console.log(`Round Duration: ${configAccount.roundDuration.toNumber()} seconds`);
    console.log(`Lock Duration: ${configAccount.lockDuration.toNumber()} seconds`);
    console.log(`Current Round Number: ${1}`);
    console.log(`Min Bet Amount: ${configAccount.minBetAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Treasury Fee: ${configAccount.treasuryFee.toNumber()}%`);
    console.log("=============================");

    // Get current round details
    const [roundPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("round"),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      programId
    );

    const roundAccount = await program.account.round.fetch(roundPda);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // Calculate timing parameters
    const startTime = roundAccount.startTime.toNumber();
    const lockTime = roundAccount.lockTime ? roundAccount.lockTime.toNumber() : null;
    const endTime = roundAccount.endTime ? roundAccount.endTime.toNumber() : null;
    
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
    console.log(`Round #: ${1}`);
    console.log(`Round State: ${roundState}`);
    console.log(`Can Place Bet: ${canPlaceBet ? "YES" : "NO"}`);
    console.log(`Is Active Flag: ${roundAccount.isActive}`);
    console.log(`Start Time: ${new Date(startTime * 1000).toLocaleString()} (${startTime})`);
    console.log(`Current Time: ${new Date(currentTimestamp * 1000).toLocaleString()} (${currentTimestamp})`);
    console.log(`Expected Lock Time: ${new Date(expectedLockTime * 1000).toLocaleString()} (${expectedLockTime})`);
    console.log(`Actual Lock Time: ${lockTime ? new Date(lockTime * 1000).toLocaleString() + ` (${lockTime})` : "Not locked"}`);
    console.log(`Expected End Time: ${new Date(expectedEndTime * 1000).toLocaleString()} (${expectedEndTime})`);
    console.log(`Actual End Time: ${endTime ? new Date(endTime * 1000).toLocaleString() + ` (${endTime})` : "Not ended"}`);
    
    // Time remaining calculations
    if (canPlaceBet) {
      const secondsUntilLock = expectedLockTime - currentTimestamp;
      console.log(`Time Remaining for Betting: ${secondsUntilLock} seconds (${Math.floor(secondsUntilLock/60)} minutes)`);
    }
    
    console.log(`Total Amount: ${roundAccount.totalAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Bull Amount: ${roundAccount.totalBullAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Bear Amount: ${roundAccount.totalBearAmount.toNumber() / LAMPORTS_PER_SOL} SOL`);
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
      }
    };
  } catch (error) {
    console.error("Failed to check detailed round status:", error);
    throw error;
  }
}

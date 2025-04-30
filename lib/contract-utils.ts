import {
    type Connection,
    type PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
  } from "@solana/web3.js"
  import { toast } from "react-hot-toast"
  
  // Helper function to place a bet on the prediction contract
  export async function placeBet(
    connection: Connection,
    contractAddress: PublicKey,
    userPublicKey: PublicKey,
    signTransaction: any,
    roundId: number,
    direction: "up" | "down",
    amount: number,
  ): Promise<string> {
    try {
      // Convert SOL amount to lamports
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL)
  
      // Create a transaction to place a bet
      const transaction = new Transaction().add(
        // Transfer SOL to the contract
        SystemProgram.transfer({
          fromPubkey: userPublicKey,
          toPubkey: contractAddress,
          lamports,
        }),
        // Add instruction for the bet direction and round
        new TransactionInstruction({
          keys: [
            { pubkey: userPublicKey, isSigner: true, isWritable: true },
            { pubkey: contractAddress, isSigner: false, isWritable: true },
          ],
          programId: contractAddress,
          data: Buffer.from(
            Uint8Array.of(
              0, // Instruction index for placing bet
              ...new Uint32Array([roundId]).buffer,
              direction === "up" ? 1 : 0,
            ),
          ),
        }),
      )
  
      // Set recent blockhash and fee payer
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = userPublicKey
  
      // Have the user sign the transaction
      const signedTransaction = await signTransaction(transaction)
  
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
  
      // Wait for confirmation with a longer timeout
      const confirmation = await connection.confirmTransaction(signature, "confirmed")
  
      if (confirmation.value.err) {
        throw new Error(`Transaction confirmed but failed: ${confirmation.value.err}`)
      }
  
      // Log transaction details for debugging
      console.log("Bet placed successfully:", {
        signature,
        roundId,
        direction,
        amount,
      })
  
      return signature
    } catch (error) {
      console.error("Error placing bet:", error)
      throw new Error(`Failed to place bet: ${error.message}`)
    }
  }
  
  // Helper function to claim rewards from the prediction contract
  export async function claimRewards(
    connection: Connection,
    contractAddress: PublicKey,
    userPublicKey: PublicKey,
    signTransaction: any,
  ): Promise<string> {
    try {
      // Create a transaction to claim rewards
      const transaction = new Transaction().add(
        new TransactionInstruction({
          keys: [
            { pubkey: userPublicKey, isSigner: true, isWritable: true },
            { pubkey: contractAddress, isSigner: false, isWritable: true },
          ],
          programId: contractAddress,
          data: Buffer.from(Uint8Array.of(1)), // Instruction index for claiming rewards
        }),
      )
  
      // Set recent blockhash and fee payer
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      transaction.feePayer = userPublicKey
  
      // Have the user sign the transaction
      const signedTransaction = await signTransaction(transaction)
  
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTransaction.serialize())
  
      // Wait for confirmation with a longer timeout
      const confirmation = await connection.confirmTransaction(signature, "confirmed")
  
      if (confirmation.value.err) {
        throw new Error(`Transaction confirmed but failed: ${confirmation.value.err}`)
      }
  
      // Log transaction details for debugging
      console.log("Rewards claimed successfully:", {
        signature,
        userPublicKey: userPublicKey.toString(),
      })
  
      return signature
    } catch (error) {
      console.error("Error claiming rewards:", error)
      throw new Error(`Failed to claim rewards: ${error.message}`)
    }
  }
  
  // Helper function to get user's bet history from the contract
  export async function getUserBetHistory(
    connection: Connection,
    contractAddress: PublicKey,
    userPublicKey: PublicKey,
  ): Promise<any[]> {
    try {
      // In a real implementation, you would query the contract for the user's bet history
      // This is a placeholder that would be replaced with actual contract interaction
      console.log("Getting bet history for user:", userPublicKey.toString())
  
      // For now, return an empty array
      return []
    } catch (error) {
      console.error("Error getting user bet history:", error)
      toast.error("Failed to load bet history")
      return []
    }
  }
  
  // Helper function to get claimable rewards from the contract
  export async function getClaimableRewards(
    connection: Connection,
    contractAddress: PublicKey,
    userPublicKey: PublicKey,
  ): Promise<number> {
    try {
      // In a real implementation, you would query the contract for the user's claimable rewards
      // This is a placeholder that would be replaced with actual contract interaction
      console.log("Getting claimable rewards for user:", userPublicKey.toString())
  
      // For now, return 0
      return 0
    } catch (error) {
      console.error("Error getting claimable rewards:", error)
      toast.error("Failed to load claimable rewards")
      return 0
    }
  }
  
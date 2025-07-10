'use client'
import { useAnchorWallet, useConnection} from "@solana/wallet-adapter-react"
import { useEffect, useMemo, useState } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@project-serum/anchor";

import * as idl from "@/lib/idl.json";
import { PROGRAM_ID, RPC_URL } from "@/lib/config";

const programId = new PublicKey(PROGRAM_ID)

export const useProgram = () => {
    const [program, setProgram] = useState<Program<Idl>>();
    const [error, setError] = useState<string | null>(null);
    const wallet = useAnchorWallet();
    const { connection } = useConnection();

    useEffect(() => {
        try {
            const updateProgram = () => {
                if (!connection) return;
                // Condition 1: Wallet must be connected
                // Condition 2: Connection must be established
                if (!wallet) {
                    // For read-only operations, use a dummy wallet
                    const dummyWallet = {
                        publicKey: new PublicKey("11111111111111111111111111111111"),
                        signTransaction: async (tx: any) => tx,
                        signAllTransactions: async (txs: any[]) => txs,
                    };
                    
                    const provider = new AnchorProvider(connection, dummyWallet, { commitment: "confirmed" });
                    const program = new Program(idl as Idl, programId, provider);

                    // This check is good, but won't prevent the Program constructor from running
                    if (!program.account?.config) {
                        throw new Error("Config account not defined in IDL");
                    }
                    setProgram(program);
                    return; // Exit early
                }

                try {
                    
                    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
                    const program = new Program(idl as Idl, programId, provider);

                    // This check is good, but won't prevent the Program constructor from running
                    if (!program.account?.config) {
                        throw new Error("Config account not defined in IDL");
                    }

                    setProgram(program);
                    setError(null);
                } catch (err) {
                    console.error("Error initializing program:", err);
                    setError(`Error initializing program: ${err instanceof Error ? err.message : String(err)}`);
                    setProgram(undefined);
                }
            };

            updateProgram();
        } catch (err) {
            // Catch any unexpected errors at the useEffect level
            console.error("useProgram Error:", err);
            setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
        }
    }, [wallet, connection]);

    return { program, error };
};
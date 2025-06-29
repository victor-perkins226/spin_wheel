'use client'
import { useAnchorWallet} from "@solana/wallet-adapter-react"
import { useEffect, useMemo, useState } from "react";
import { PublicKey, Connection, Keypair, } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@project-serum/anchor";

import * as idl from "@/lib/idl.json";
import { PROGRAM_ID, RPC_URL } from "@/lib/config";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

const programId = new PublicKey(PROGRAM_ID)

export const useProgram = () => {
    const [program, setProgram] = useState<Program<Idl>>();
    const [error, setError] = useState<string | null>(null);
    const wallet = useAnchorWallet();
    const connection = useMemo(() => new Connection(
        RPC_URL,
        {
            commitment: "finalized",
            wsEndpoint: 'wss://lb.drpc.org/ogws?network=solana-devnet&dkey=AqnRwY5nD0C_uEv_hPfBwlLj0fFzMcQR8JKdzoXPVSjK',
        }
    ), [])

    useEffect(() => {
        try {
            const updateProgram = () => {
                // Condition 1: Wallet must be connected
                // Condition 2: Connection must be established
                if (!wallet || !connection) {
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
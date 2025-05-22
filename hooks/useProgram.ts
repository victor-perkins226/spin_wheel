'use client'
import { useAnchorWallet} from "@solana/wallet-adapter-react"
import { useEffect, useMemo, useState } from "react";
import { PublicKey,Connection, } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@project-serum/anchor";

import * as idl from "@/lib/idl.json";


const programId = new PublicKey("AKui3UEpyUEhtnqsDChTL76DFncYx6rRqp6CSShnUm9r")

export const useProgram = () => {
    const [program, setProgram] = useState<Program<Idl>>();
    const [error, setError] = useState<string | null>(null);
    const wallet = useAnchorWallet();
    const connection = useMemo(() => new Connection(
        "https://lb.drpc.org/ogrpc?network=solana-devnet&dkey=AqnRwY5nD0C_uEv_hPfBwlLj0fFzMcQR8JKdzoXPVSjK",
        {
            commitment: "finalized",
            wsEndpoint: 'wss://lb.drpc.org/ogws?network=solana-devnet&dkey=AqnRwY5nD0C_uEv_hPfBwlLj0fFzMcQR8JKdzoXPVSjK',
        }
    ), [])


    useEffect(() => {
        const updateProgram = () => {
          // Condition 1: Wallet must be connected
          // Condition 2: Connection must be established
          if (!wallet || !connection) {
            setProgram(undefined); // Clear program if conditions not met
            setError(!wallet ? "Wallet not connected" : "Connection not established");
            return; // Exit early
          }

          try {
            const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
            const program = new Program(idl as Idl, programId, provider);

            // This check is good, but won't prevent the Program constructor from running
            if (!program.account?.config) {
              throw new Error("Config account not defined in IDL");
            }
            setProgram(program); // Set program on success
            setError(null); // Clear error
          } catch (err) {
            console.error("Failed to initialize program:", err);
            setProgram(undefined); // Clear program on error
            setError(`Failed to initialize program: ${(err as Error).message}`);
          }
        };

        updateProgram();
    }, [wallet, connection]); // Dependencies: Re-run when wallet or connection changes

    return {
        program,
        wallet,
        connection,
        error, // Expose error state
    };
};
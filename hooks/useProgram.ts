'use client'
import { useAnchorWallet, useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Idl } from "@project-serum/anchor";

import * as idl from "@/lib/idl.json";


const programId = new PublicKey("CXpSQ4p9H5HvLnfBptGzqmSYu2rbyrDpwJkP9gGMutoT")

export const useProgram = () => {
    const [program, setProgram] = useState<Program<Idl>>();
    const wallet = useAnchorWallet();
    const { connection } = useConnection();


    useEffect(() => {
        const updateProgram = () => {
            if (wallet) {

                const provider = new AnchorProvider(connection, wallet, {
                });

                const program = new Program(idl as Idl, programId, provider);

                setProgram(program);
            } else {
                setProgram(undefined);
            }
        };
        updateProgram();
    }, [connection, wallet,]);



    return {
        program,
        wallet,
        connection,
        
    };
};
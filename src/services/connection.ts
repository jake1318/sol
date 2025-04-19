import { Connection } from "@solana/web3.js";
import { SOLANA_RPC } from "../config/env";

let singleton: Connection | null = null;

export const ConnectionService = {
  getConnection(): Connection {
    if (!singleton) {
      singleton = new Connection(SOLANA_RPC, { commitment: "confirmed" });
    }
    return singleton;
  },
};

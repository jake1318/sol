import { useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "../contexts/WalletContext";
import { JUPITER_API } from "../config/env";

export function useJupiterSwap() {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const swap = async (
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number
  ): Promise<string> => {
    if (!publicKey) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      // 1) Quote
      const amtAtomic = Math.floor(amount * 10 ** 9);
      const quoteRes = await fetch(
        `${JUPITER_API.quote}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amtAtomic}&slippageBps=${slippageBps}`
      );
      const quoteJson = await quoteRes.json();
      if (!quoteJson.data || quoteJson.data.length === 0)
        throw new Error("No route");
      // 2) Swap
      const swapRes = await fetch(JUPITER_API.swap, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quoteJson,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
        }),
      });
      const swapJson = await swapRes.json();
      if (!swapJson.swapTransaction)
        throw new Error(swapJson.error || "Swap error");
      const txBuf = Buffer.from(swapJson.swapTransaction, "base64");
      const tx = VersionedTransaction.deserialize(txBuf);
      const signed = await signTransaction(tx);
      const connection = useConnection(); // your ConnectionService
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);
      return sig;
    } finally {
      setLoading(false);
    }
  };

  return { swap, loading };
}

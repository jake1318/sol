import { useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";

export function useJupiterSwap() {
  const { publicKey, signTransaction } = useUnifiedWalletContext();
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const [loading, setLoading] = useState(false);

  const executeSwap = async (
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number
  ) => {
    if (!publicKey) {
      throw new Error("Connect wallet first");
    }
    setLoading(true);
    try {
      // Convert amount to atomic unit (assumes 9 decimals for SOL; adjust for other tokens)
      const amountAtomic = Math.floor(amount * 1e9);
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountAtomic}&slippageBps=${slippageBps}`;
      const quoteRes = await fetch(quoteUrl);
      const quoteResponse = await quoteRes.json();
      if (
        !quoteResponse ||
        !quoteResponse.data ||
        quoteResponse.data.length === 0
      ) {
        throw new Error("No route found");
      }
      // Pick the best route (for simplicity)
      const bestQuote = quoteResponse.data[0];

      // Request swap transaction
      const swapReq = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
        }),
      });
      const swapJson = await swapReq.json();
      if (!swapJson.swapTransaction)
        throw new Error("Swap transaction missing");
      const swapTxBuf = Buffer.from(swapJson.swapTransaction, "base64");
      const tx = VersionedTransaction.deserialize(swapTxBuf);

      // Sign the transaction with the connected wallet
      const signedTx = await signTransaction!(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
      });
      await connection.confirmTransaction(
        { signature: txid, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
      return txid;
    } finally {
      setLoading(false);
    }
  };

  return { executeSwap, loading };
}

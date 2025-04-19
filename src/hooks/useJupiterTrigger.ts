import { useState } from "react";
import { VersionedTransaction } from "@solana/web3.js";
import { useWallet } from "../contexts/WalletContext";
import { JUPITER_API } from "../config/env";

export function useJupiterTrigger() {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const placeOrder = async (
    inputMint: string,
    outputMint: string,
    sellAmt: number,
    buyAmt: number,
    expiryUnix?: number
  ): Promise<{ order: string; tx: string }> => {
    if (!publicKey) throw new Error("Connect wallet");
    setLoading(true);
    try {
      const maker = publicKey.toBase58();
      const body: any = {
        inputMint,
        outputMint,
        maker,
        payer: maker,
        params: {
          makingAmount: (sellAmt * 10 ** 9).toFixed(0),
          takingAmount: (buyAmt * 10 ** 6).toFixed(0),
        },
        computeUnitPrice: "auto",
      };
      if (expiryUnix) body.params.expiredAt = expiryUnix;
      const res = await fetch(`${JUPITER_API.trigger}/createOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const buf = Buffer.from(json.transaction, "base64");
      const tx = VersionedTransaction.deserialize(buf);
      const signed = await signTransaction(tx);
      const connection = useConnection();
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig);
      return { order: json.order, tx: sig };
    } finally {
      setLoading(false);
    }
  };

  return { placeOrder, loading };
}

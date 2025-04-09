import { useState } from "react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";

export function useJupiterTrigger() {
  const { publicKey, signTransaction } = useUnifiedWalletContext();
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const [loading, setLoading] = useState(false);

  const placeLimitOrder = async (
    inputMint: string,
    outputMint: string,
    sellAmount: number,
    buyAmount: number,
    expiry?: number
  ) => {
    if (!publicKey) {
      throw new Error("Connect wallet first");
    }
    setLoading(true);
    try {
      const makerAddress = publicKey.toBase58();
      // Convert amounts: assume 9 decimals for sell token and 6 decimals for buy token (adjust as needed)
      const sellAmountAtomic = (sellAmount * 1e9).toFixed(0);
      const buyAmountAtomic = (buyAmount * 1e6).toFixed(0);
      const params: any = {
        makingAmount: sellAmountAtomic,
        takingAmount: buyAmountAtomic,
      };
      if (expiry) params.expiredAt = expiry;

      const response = await fetch(
        "https://api.jup.ag/trigger/v1/createOrder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputMint,
            outputMint,
            maker: makerAddress,
            payer: makerAddress,
            params,
            computeUnitPrice: "auto",
          }),
        }
      );
      const createOrderResponse = await response.json();
      if (createOrderResponse.error) {
        throw new Error(createOrderResponse.error);
      }
      if (!createOrderResponse.transaction)
        throw new Error("Missing transaction from API");
      const tx = VersionedTransaction.deserialize(
        Buffer.from(createOrderResponse.transaction, "base64")
      );
      const signedTx = await signTransaction!(tx);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(
        { signature: txid, ...(await connection.getLatestBlockhash()) },
        "confirmed"
      );
      return { order: createOrderResponse.order, txid };
    } finally {
      setLoading(false);
    }
  };

  return { placeLimitOrder, loading };
}

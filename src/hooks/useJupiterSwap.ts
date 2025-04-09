import { useState, useCallback } from "react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";
import ConnectionService from "../services/connection";
import { getApiEndpoints } from "../config/env";

interface Quote {
  inAmount: number;
  outAmount: number;
  outAmountWithSlippage: number;
  priceImpactPct: number;
  marketInfos: { label: string }[];
  routePlan: any[];
  slippageBps: number;
  otherAmountThreshold: string;
  swapMode: string;
}

export function useJupiterSwap() {
  const { publicKey, signTransaction } = useUnifiedWalletContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuote, setLastQuote] = useState<Quote | null>(null);

  // Get token decimals - in a production app you would fetch this from a token list
  const getTokenDecimals = async (mint: string): Promise<number> => {
    // Common known tokens
    const knownTokens: Record<string, number> = {
      So11111111111111111111111111111111111111112: 9, // SOL
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 6, // USDC
      Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 6, // USDT
      DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 5, // BONK
      mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: 9, // mSOL
    };

    if (knownTokens[mint]) {
      return knownTokens[mint];
    }

    // For production, you would fetch from an API or token registry
    const connection = ConnectionService.getInstance().getConnection();
    try {
      const mintInfo = await connection.getParsedAccountInfo(
        new PublicKey(mint)
      );
      if (!mintInfo.value) {
        throw new Error("Mint info not found");
      }

      // @ts-ignore - solana/web3.js typings don't include parsed account data structure
      const decimals = mintInfo.value.data.parsed?.info?.decimals;
      return decimals || 9; // Default to 9 if not found
    } catch (err) {
      console.error("Error fetching token decimals:", err);
      return 9; // Default to 9 decimals as fallback
    }
  };

  const getQuote = useCallback(
    async (
      inputMint: string,
      outputMint: string,
      amount: number,
      slippageBps: number
    ): Promise<Quote> => {
      // Get API endpoints
      const apiEndpoints = getApiEndpoints();

      // Get token decimals
      const inputDecimals = await getTokenDecimals(inputMint);

      // Convert amount to atomic unit based on token decimals
      const amountAtomic = Math.floor(amount * Math.pow(10, inputDecimals));

      // Build quote URL
      const quoteUrl = `${apiEndpoints.jupiter.quoteApi}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountAtomic}&slippageBps=${slippageBps}`;

      // Fetch quote with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const quoteRes = await fetch(quoteUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!quoteRes.ok) {
          throw new Error(
            `Quote API returned ${quoteRes.status}: ${await quoteRes.text()}`
          );
        }

        const quoteResponse = await quoteRes.json();

        // Validate quote response
        if (
          !quoteResponse ||
          !quoteResponse.data ||
          quoteResponse.data.length === 0
        ) {
          throw new Error("No swap route found");
        }

        // Return the best route
        return quoteResponse.data[0];
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error("Quote request timed out");
        }
        throw err;
      }
    },
    []
  );

  const executeSwap = async (
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number
  ) => {
    if (!publicKey) {
      throw new Error("Connect wallet first");
    }

    if (!signTransaction) {
      throw new Error("Wallet does not support transaction signing");
    }

    setLoading(true);
    setError(null);

    try {
      const connectionService = ConnectionService.getInstance();
      const connection = connectionService.getConnection();

      // Validate connection or switch to fallback
      if (!(await connectionService.validateConnection())) {
        throw new Error("Failed to connect to Solana network");
      }

      // Get API endpoints
      const apiEndpoints = getApiEndpoints();

      // Get quote
      const quote = await getQuote(inputMint, outputMint, amount, slippageBps);
      setLastQuote(quote);

      // Log quote details
      console.log(
        `Quote: ${amount} → ${
          quote.outAmount / Math.pow(10, await getTokenDecimals(outputMint))
        }`
      );
      console.log("Route:", quote.marketInfos.map((m) => m.label).join(" → "));
      console.log(`Price impact: ${(quote.priceImpactPct * 100).toFixed(2)}%`);

      // Request swap transaction
      const swapReq = await fetch(apiEndpoints.jupiter.swapApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: { data: [quote] },
          userPublicKey: publicKey.toBase58(),
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapReq.ok) {
        throw new Error(
          `Swap API returned ${swapReq.status}: ${await swapReq.text()}`
        );
      }

      const swapJson = await swapReq.json();

      if (!swapJson.swapTransaction) {
        throw new Error("Swap transaction missing from response");
      }

      const swapTxBuf = Buffer.from(swapJson.swapTransaction, "base64");
      const tx = VersionedTransaction.deserialize(swapTxBuf);

      // Sign the transaction with the connected wallet
      const signedTx = await signTransaction(tx);

      // Send transaction without skipPreflight (important for safety)
      const txid = await connection.sendRawTransaction(signedTx.serialize());

      console.log("Swap transaction sent:", txid);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: txid,
          ...(await connection.getLatestBlockhash()),
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction confirmed but failed: ${JSON.stringify(
            confirmation.value.err
          )}`
        );
      }

      console.log("Swap transaction confirmed:", txid);
      return txid;
    } catch (err: any) {
      console.error("Swap execution error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { executeSwap, loading, error, lastQuote };
}

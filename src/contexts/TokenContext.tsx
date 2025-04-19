import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useWallet } from "./WalletContext";
import { TokenInfo } from "../types/Token";
import { PublicKey } from "@solana/web3.js";

// Types...
type TokenContextType = {
  tokens: TokenInfo[];
  userTokens: TokenInfo[];
  refreshUserTokens: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
};

const TokenContext = createContext<TokenContextType>({} as any);
export const useTokens = () => useContext(TokenContext);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { connection, publicKey, connected } = useWallet();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch global token list
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await axios.get<TokenInfo[]>("https://token.jup.ag/all");
        setTokens(
          res.data.filter(
            (t) => t.address && t.decimals >= 0 && t.symbol && t.logoURI
          )
        );
      } catch {
        setError("Failed to load token list");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Fetch user balances
  const loadUserTokens = async () => {
    if (!connected || !publicKey) {
      setUserTokens([]);
      return;
    }
    try {
      setIsLoading(true);
      const acctRes = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
        }
      );
      const list: TokenInfo[] = [];
      for (let { account } of acctRes.value) {
        const info = (account.data as any).parsed.info;
        const mint = info.mint;
        const bal = info.tokenAmount.uiAmount;
        if (bal > 0) {
          const meta = tokens.find((t) => t.address === mint);
          if (meta) list.push({ ...meta, balance: bal });
        }
      }
      // SOL
      const lamports = await connection.getBalance(publicKey);
      if (lamports > 0) {
        const sol = tokens.find((t) => t.symbol.toUpperCase() === "SOL");
        if (sol) list.unshift({ ...sol, balance: lamports / 1e9 });
      }
      setUserTokens(list);
    } catch (e) {
      setError("Failed to fetch balances");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh on wallet change
  useEffect(() => {
    loadUserTokens();
  }, [connected, publicKey, tokens, connection]);

  return (
    <TokenContext.Provider
      value={{
        tokens,
        userTokens,
        refreshUserTokens: loadUserTokens,
        isLoading,
        error,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

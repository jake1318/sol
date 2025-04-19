import React, { createContext, useContext } from "react";
import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";

export const WalletContext = createContext(useUnifiedWalletContext());

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const wallet = useUnifiedWalletContext();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);

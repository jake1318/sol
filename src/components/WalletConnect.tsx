import React from "react";
import { useWallet } from "../contexts/WalletContext";

export const WalletConnect: React.FC = () => {
  const { publicKey, connected, setShowModal } = useWallet();
  const shortKey =
    publicKey?.toBase58().slice(0, 4) + "..." + publicKey?.toBase58().slice(-4);
  return (
    <button className="wallet-btn" onClick={() => setShowModal(true)}>
      {connected ? `Wallet: ${shortKey}` : "Connect Wallet"}
    </button>
  );
};

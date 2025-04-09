import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";

export const WalletConnect: React.FC = () => {
  const { publicKey, connected, setShowModal } = useUnifiedWalletContext();
  const shortKey = publicKey
    ? publicKey.toBase58().slice(0, 4) + "..." + publicKey.toBase58().slice(-4)
    : "";

  return (
    <button className="wallet-btn" onClick={() => setShowModal(true)}>
      {connected ? `Wallet: ${shortKey}` : "Connect Wallet"}
    </button>
  );
};

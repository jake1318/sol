import { useEffect, useState } from "react";
import { Connection, Transaction } from "@solana/web3.js";
import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";
import {
  getRaydiumPoolInfo,
  PoolInfo,
  depositToRaydiumPool,
} from "../utils/raydium";

const Pools: React.FC = () => {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const { publicKey, signTransaction } = useUnifiedWalletContext();
  const connection = new Connection("https://api.mainnet-beta.solana.com");

  useEffect(() => {
    const fetchPools = async () => {
      const poolList = await getRaydiumPoolInfo();
      setPools(poolList);
      // Set a default pool (e.g. SOL-USDC) if available.
      const solUsdc = poolList.find((p) => p.name === "SOL-USDC");
      if (solUsdc) setSelectedPool(solUsdc);
    };
    fetchPools();
  }, []);

  const handleAddLiquidity = async () => {
    if (!publicKey || !selectedPool) {
      return alert("Please connect your wallet and select a pool.");
    }
    try {
      const tx = new Transaction();
      const ix = await depositToRaydiumPool(
        selectedPool,
        publicKey,
        parseFloat(amountA),
        parseFloat(amountB)
      );
      tx.add(ix);
      const latestHash = await connection.getLatestBlockhash();
      tx.recentBlockhash = latestHash.blockhash;
      tx.feePayer = publicKey;
      const signed = await signTransaction!(tx);
      const txid = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(
        { signature: txid, ...latestHash },
        "confirmed"
      );
      alert("Liquidity added successfully! TxID: " + txid);
    } catch (err: any) {
      alert("Add liquidity failed: " + err.message);
    }
  };

  return (
    <div className="pools-page">
      <h2>Liquidity Pools & Yield</h2>
      {selectedPool ? (
        <div className="pool-detail">
          <h3>{selectedPool.name} Pool</h3>
          <p>TVL: ${selectedPool.liquidity.toFixed(2)}</p>
          <p>APR: {selectedPool.apr.toFixed(2)}%</p>
          <div className="liquidity-form">
            <label>
              Deposit {selectedPool.base}:
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
              />
            </label>
            <label>
              Deposit {selectedPool.quote}:
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
              />
            </label>
            <button onClick={handleAddLiquidity}>Add Liquidity</button>
          </div>
        </div>
      ) : (
        <p>Loading pool data...</p>
      )}
    </div>
  );
};

export default Pools;

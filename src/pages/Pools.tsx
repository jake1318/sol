import React, { useEffect, useState } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { useUnifiedWalletContext } from "@jup-ag/wallet-adapter";
import {
  getRaydiumPoolInfo,
  PoolInfo,
  depositToRaydiumPool,
  withdrawFromRaydiumPool,
  collectRewards,
  getUserLpBalance,
} from "../utils/raydium";
import { RemoveLiquidityTab, RewardsTab } from "../components/PoolTabs";
import ConnectionService from "../services/connection";
import { getEnvironmentName, isProduction } from "../config/env";
import "../styles/pools.css";

// Tab type definition
type TabType = "add" | "remove" | "rewards";

const Pools: React.FC = () => {
  // State variables
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("add");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLpTokens, setUserLpTokens] = useState<number>(0);

  // Get wallet and connection
  const { publicKey, signTransaction } = useUnifiedWalletContext();
  const connectionService = ConnectionService.getInstance();
  const connection = connectionService.getConnection();
  const environmentName = getEnvironmentName();

  // Fetch pools on component mount
  useEffect(() => {
    const fetchPools = async () => {
      setLoading(true);
      setError(null);
      try {
        const poolList = await getRaydiumPoolInfo();
        setPools(poolList);
        // Set a default pool (e.g. SOL-USDC) if available
        const solUsdc = poolList.find((p) => p.name === "SOL-USDC");
        if (solUsdc) setSelectedPool(solUsdc);
      } catch (err: any) {
        setError(`Failed to load pools: ${err.message}`);
        console.error("Error loading pools:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, []);

  // Fetch user LP balance when wallet or selected pool changes
  useEffect(() => {
    const fetchUserLpBalance = async () => {
      if (!publicKey || !selectedPool) return;

      try {
        const balance = await getUserLpBalance(selectedPool, publicKey);
        setUserLpTokens(balance);
      } catch (err: any) {
        console.error("Error fetching LP balance:", err);
        setUserLpTokens(0);
      }
    };

    if (publicKey && selectedPool) {
      fetchUserLpBalance();
    } else {
      setUserLpTokens(0);
    }
  }, [publicKey, selectedPool]);

  const handleAddLiquidity = async () => {
    if (!publicKey || !selectedPool) {
      return setError("Please connect your wallet and select a pool.");
    }

    if (!signTransaction) {
      return setError("Wallet does not support transaction signing");
    }

    setLoading(true);
    setError(null);
    setTxStatus("Preparing transaction...");

    try {
      // Validate inputs
      const parsedAmountA = parseFloat(amountA);
      const parsedAmountB = parseFloat(amountB);

      if (isNaN(parsedAmountA) || parsedAmountA <= 0) {
        throw new Error(`Please enter a valid amount for ${selectedPool.base}`);
      }

      if (isNaN(parsedAmountB) || parsedAmountB <= 0) {
        throw new Error(
          `Please enter a valid amount for ${selectedPool.quote}`
        );
      }

      // Create transaction
      setTxStatus("Creating add liquidity instructions...");
      const tx = await depositToRaydiumPool(
        selectedPool,
        publicKey,
        parsedAmountA,
        parsedAmountB
      );

      // Get latest blockhash
      setTxStatus("Getting latest blockhash...");
      const latestHash = await connection.getLatestBlockhash();
      tx.recentBlockhash = latestHash.blockhash;
      tx.feePayer = publicKey;

      // Sign transaction
      setTxStatus("Waiting for wallet signature...");
      const signed = await signTransaction(tx);

      // Send transaction
      setTxStatus("Sending transaction...");
      const txid = await connection.sendRawTransaction(signed.serialize());

      // Confirm transaction
      setTxStatus(`Confirming transaction: ${txid}`);
      const confirmation = await connection.confirmTransaction(
        {
          signature: txid,
          ...latestHash,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      setTxStatus(`Liquidity added successfully! TxID: ${txid}`);

      // Update LP balance
      setTimeout(async () => {
        if (publicKey && selectedPool) {
          const balance = await getUserLpBalance(selectedPool, publicKey);
          setUserLpTokens(balance);
        }
      }, 2000);

      // Reset form fields
      setAmountA("");
      setAmountB("");
    } catch (err: any) {
      console.error("Add liquidity failed:", err);
      setError(`Add liquidity failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!publicKey || !selectedPool) {
      return setError("Please connect your wallet and select a pool.");
    }

    if (!signTransaction) {
      return setError("Wallet does not support transaction signing");
    }

    setLoading(true);
    setError(null);
    setTxStatus("Preparing transaction...");

    try {
      // Validate input
      const parsedLpAmount = parseFloat(lpAmount);

      if (isNaN(parsedLpAmount) || parsedLpAmount <= 0) {
        throw new Error("Please enter a valid LP token amount");
      }

      if (parsedLpAmount > userLpTokens) {
        throw new Error(
          `Insufficient LP tokens. You have ${userLpTokens.toFixed(
            6
          )} available.`
        );
      }

      // Create transaction
      setTxStatus("Creating remove liquidity instructions...");
      const tx = await withdrawFromRaydiumPool(
        selectedPool,
        publicKey,
        parsedLpAmount
      );

      // Get latest blockhash
      setTxStatus("Getting latest blockhash...");
      const latestHash = await connection.getLatestBlockhash();
      tx.recentBlockhash = latestHash.blockhash;
      tx.feePayer = publicKey;

      // Sign transaction
      setTxStatus("Waiting for wallet signature...");
      const signed = await signTransaction(tx);

      // Send transaction
      setTxStatus("Sending transaction...");
      const txid = await connection.sendRawTransaction(signed.serialize());

      // Confirm transaction
      setTxStatus(`Confirming transaction: ${txid}`);
      const confirmation = await connection.confirmTransaction(
        {
          signature: txid,
          ...latestHash,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      setTxStatus(`Liquidity removed successfully! TxID: ${txid}`);

      // Update LP balance
      setTimeout(async () => {
        if (publicKey && selectedPool) {
          const balance = await getUserLpBalance(selectedPool, publicKey);
          setUserLpTokens(balance);
        }
      }, 2000);

      // Reset form field
      setLpAmount("");
    } catch (err: any) {
      console.error("Remove liquidity failed:", err);
      setError(`Remove liquidity failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleHarvestRewards = async () => {
    if (!publicKey || !selectedPool) {
      return setError("Please connect your wallet and select a pool.");
    }

    if (!selectedPool.farmId) {
      return setError("This pool does not have harvestable rewards.");
    }

    if (!signTransaction) {
      return setError("Wallet does not support transaction signing");
    }

    setLoading(true);
    setError(null);
    setTxStatus("Preparing harvest transaction...");

    try {
      // For now, just show an informational message
      setError(
        "Reward harvesting is not yet implemented. Please use Raydium's UI to collect rewards."
      );

      /* When fully implemented, you would:
      // Create transaction
      const tx = await collectRewards(selectedPool, publicKey);
      if (!tx) {
        throw new Error("Failed to create harvest transaction");
      }
      
      // Get latest blockhash
      setTxStatus("Getting latest blockhash...");
      const latestHash = await connection.getLatestBlockhash();
      tx.recentBlockhash = latestHash.blockhash;
      tx.feePayer = publicKey;
      
      // Sign transaction
      setTxStatus("Waiting for wallet signature...");
      const signed = await signTransaction(tx);
      
      // Send transaction
      setTxStatus("Sending transaction...");
      const txid = await connection.sendRawTransaction(signed.serialize());
      
      // Confirm transaction
      setTxStatus(`Confirming transaction: ${txid}`);
      const confirmation = await connection.confirmTransaction({
        signature: txid,
        ...latestHash
      }, "confirmed");
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      setTxStatus(`Rewards harvested successfully! TxID: ${txid}`);
      */
    } catch (err: any) {
      console.error("Harvest rewards failed:", err);
      setError(`Harvest rewards failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Tab button component
  const TabButton: React.FC<{
    label: string;
    tabId: TabType;
    disabled?: boolean;
  }> = ({ label, tabId, disabled }) => (
    <button
      className={`tab-btn ${activeTab === tabId ? "active" : ""}`}
      onClick={() => setActiveTab(tabId)}
      disabled={disabled}
    >
      {label}
    </button>
  );

  return (
    <div className="pools-page">
      <h2>Liquidity Pools & Yield</h2>

      {/* Environment indicator */}
      <div className="environment-indicator">
        <span className={`env-tag ${isProduction() ? "production" : ""}`}>
          {environmentName}
        </span>
      </div>

      {/* Connection status */}
      <div className="connection-status">
        RPC:{" "}
        {connectionService.getCurrentEndpoint().split("//")[1].split(".")[0]}...
      </div>

      {/* Status and error messages */}
      {txStatus && <div className="status-message">{txStatus}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Pool selection */}
      <div className="pool-selector">
        <label>Select Pool:</label>
        <select
          value={selectedPool?.id || ""}
          onChange={(e) => {
            const pool = pools.find((p) => p.id === e.target.value);
            setSelectedPool(pool || null);
          }}
          disabled={loading}
        >
          <option value="">-- Select a pool --</option>
          {pools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              {pool.name} - APR: {pool.apr.toFixed(2)}%
            </option>
          ))}
        </select>
      </div>

      {selectedPool ? (
        <div className="pool-detail">
          <h3>{selectedPool.name} Pool</h3>
          <p>TVL: ${selectedPool.liquidity.toFixed(2)}</p>
          <p>APR: {selectedPool.apr.toFixed(2)}%</p>
          {publicKey && <p>Your LP Tokens: {userLpTokens.toFixed(6)}</p>}
          {!publicKey && (
            <p className="wallet-note">Connect wallet to see your LP balance</p>
          )}

          {/* Tabs for different actions */}
          <div className="pool-actions">
            <div className="tabs">
              <TabButton label="Add Liquidity" tabId="add" />
              <TabButton
                label="Remove Liquidity"
                tabId="remove"
                disabled={userLpTokens <= 0}
              />
              <TabButton
                label="Rewards"
                tabId="rewards"
                disabled={!selectedPool.farmId}
              />
            </div>

            {/* Add Liquidity Tab */}
            {activeTab === "add" && (
              <div className="liquidity-form">
                <h4>Add Liquidity</h4>
                <label>
                  Deposit {selectedPool.base}:
                  <input
                    type="number"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    disabled={loading}
                    placeholder={`Enter ${selectedPool.base} amount`}
                    min="0"
                    step="any"
                  />
                </label>
                <label>
                  Deposit {selectedPool.quote}:
                  <input
                    type="number"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    disabled={loading}
                    placeholder={`Enter ${selectedPool.quote} amount`}
                    min="0"
                    step="any"
                  />
                </label>
                <button
                  onClick={handleAddLiquidity}
                  disabled={loading || !publicKey}
                >
                  {loading ? "Processing..." : "Add Liquidity"}
                </button>
              </div>
            )}

            {/* Remove Liquidity Tab */}
            {activeTab === "remove" && (
              <RemoveLiquidityTab
                selectedPool={selectedPool}
                userWallet={publicKey}
                lpAmount={lpAmount}
                setLpAmount={setLpAmount}
                userLpTokens={userLpTokens}
                loading={loading}
                onRemoveLiquidity={handleRemoveLiquidity}
                onHarvestRewards={handleHarvestRewards}
              />
            )}

            {/* Rewards Tab */}
            {activeTab === "rewards" && (
              <RewardsTab
                selectedPool={selectedPool}
                userWallet={publicKey}
                lpAmount={lpAmount}
                setLpAmount={setLpAmount}
                userLpTokens={userLpTokens}
                loading={loading}
                onRemoveLiquidity={handleRemoveLiquidity}
                onHarvestRewards={handleHarvestRewards}
              />
            )}
          </div>
        </div>
      ) : (
        <p>{loading ? "Loading pool data..." : "Please select a pool"}</p>
      )}
    </div>
  );
};

export default Pools;

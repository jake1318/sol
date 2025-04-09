import React from "react";
import { PublicKey } from "@solana/web3.js";
import { PoolInfo } from "../utils/raydium";

interface TabsProps {
  selectedPool: PoolInfo;
  userWallet: PublicKey | null;
  lpAmount: string;
  setLpAmount: (amount: string) => void;
  userLpTokens: number;
  loading: boolean;
  onRemoveLiquidity: () => Promise<void>;
  onHarvestRewards: () => Promise<void>;
}

export const RemoveLiquidityTab: React.FC<TabsProps> = ({
  selectedPool,
  userWallet,
  lpAmount,
  setLpAmount,
  userLpTokens,
  loading,
  onRemoveLiquidity,
}) => {
  return (
    <div className="liquidity-form">
      <h4>Remove Liquidity</h4>
      <p>Available LP Tokens: {userLpTokens.toFixed(6)}</p>
      <label>
        LP Tokens to Withdraw:
        <input
          type="number"
          value={lpAmount}
          onChange={(e) => setLpAmount(e.target.value)}
          disabled={loading || userLpTokens <= 0}
          placeholder="Enter LP amount to withdraw"
          max={userLpTokens}
        />
      </label>
      <div className="input-helper">
        <button
          className="btn-small"
          onClick={() => setLpAmount((userLpTokens * 0.25).toFixed(6))}
          disabled={loading || userLpTokens <= 0}
        >
          25%
        </button>
        <button
          className="btn-small"
          onClick={() => setLpAmount((userLpTokens * 0.5).toFixed(6))}
          disabled={loading || userLpTokens <= 0}
        >
          50%
        </button>
        <button
          className="btn-small"
          onClick={() => setLpAmount((userLpTokens * 0.75).toFixed(6))}
          disabled={loading || userLpTokens <= 0}
        >
          75%
        </button>
        <button
          className="btn-small"
          onClick={() => setLpAmount(userLpTokens.toFixed(6))}
          disabled={loading || userLpTokens <= 0}
        >
          MAX
        </button>
      </div>
      <button
        onClick={onRemoveLiquidity}
        disabled={loading || !userWallet || userLpTokens <= 0}
      >
        {loading ? "Processing..." : "Remove Liquidity"}
      </button>
    </div>
  );
};

export const RewardsTab: React.FC<TabsProps> = ({
  selectedPool,
  userWallet,
  loading,
  onHarvestRewards,
}) => {
  return (
    <div className="liquidity-form">
      <h4>Harvest Rewards</h4>
      {selectedPool.farmId ? (
        <>
          <p>Reward Tokens: {selectedPool.rewardTokens.join(", ") || "None"}</p>
          <div className="reward-info">
            <p>
              Farm ID: {selectedPool.farmId.substring(0, 8)}...
              {selectedPool.farmId.substring(selectedPool.farmId.length - 8)}
            </p>
            <p>APR: {selectedPool.apr.toFixed(2)}%</p>
          </div>
          <button onClick={onHarvestRewards} disabled={loading || !userWallet}>
            {loading ? "Processing..." : "Harvest Rewards"}
          </button>
        </>
      ) : (
        <p>This pool does not have harvestable rewards.</p>
      )}
    </div>
  );
};

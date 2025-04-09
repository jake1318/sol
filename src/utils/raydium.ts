import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getApiEndpoints } from "../config/env";
import ConnectionService from "../services/connection";
import BN from "bn.js";
import {
  Liquidity,
  LiquidityPoolKeys,
  jsonInfo2PoolKeys,
} from "@raydium-io/raydium-sdk";
import { Decimal } from "decimal.js";

// Define the pool info interface
export interface PoolInfo {
  id: string;
  name: string;
  base: string;
  quote: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpMint: string;
  liquidity: number;
  apr: number;
  rewardTokens: string[];
  programId: string;
  ammId: string;
  farmId?: string;
  baseVault: string;
  quoteVault: string;
  withdrawQueue: string;
  lpVault?: string;
  rewardVaults?: string[];
  version?: number;
  marketId?: string;
  marketProgramId?: string;
  poolKeys?: LiquidityPoolKeys;
}

// Cache for pool data to avoid excessive API calls
let poolCache: PoolInfo[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all Raydium pools from the API
 */
export async function getRaydiumPoolInfo(): Promise<PoolInfo[]> {
  // Check if cache is valid
  const now = Date.now();
  if (poolCache.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return poolCache;
  }

  try {
    // Get API endpoint
    const apiEndpoints = getApiEndpoints();

    // Fetch pool data
    const response = await fetch(apiEndpoints.raydium.poolInfoApi);
    if (!response.ok) {
      throw new Error(`Failed to fetch pool data: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.official || !Array.isArray(data.official)) {
      throw new Error("Invalid pool data format received");
    }

    // Process the pool data
    poolCache = await Promise.all(
      data.official.map(async (pool: any) => {
        try {
          // Convert to proper pool keys format for SDK
          const poolKeys = jsonInfo2PoolKeys(pool);

          return {
            id: pool.id,
            name: `${pool.baseMint.symbol}-${pool.quoteMint.symbol}`,
            base: pool.baseMint.symbol,
            quote: pool.quoteMint.symbol,
            baseDecimals: pool.baseMint.decimals,
            quoteDecimals: pool.quoteMint.decimals,
            lpMint: pool.lpMint,
            liquidity: parseFloat(pool.liquidity || "0"),
            apr: calculatePoolApr(pool),
            rewardTokens: (pool.rewardInfos || []).map(
              (r: any) => r.rewardMint.symbol
            ),
            programId: pool.programId,
            ammId: pool.id,
            farmId: pool.farmId,
            baseVault: pool.baseVault,
            quoteVault: pool.quoteVault,
            withdrawQueue: pool.withdrawQueue || "",
            version: pool.version,
            marketId: pool.marketId,
            marketProgramId: pool.marketProgramId,
            lpVault: pool.lpVault,
            rewardVaults: pool.rewardVaults || [],
            poolKeys: poolKeys,
          };
        } catch (e) {
          console.error(`Error processing pool ${pool.id}:`, e);
          throw e;
        }
      })
    );

    lastFetchTime = now;
    return poolCache;
  } catch (error: any) {
    console.error("Failed to fetch Raydium pool info:", error);
    throw new Error(`Pool data fetch failed: ${error.message}`);
  }
}

/**
 * Calculate APR for a pool
 */
function calculatePoolApr(poolData: any): number {
  try {
    // Use the 7-day APR if available, otherwise use the standard APR or default to 0
    const apr = poolData.apr7d || poolData.apr || 0;
    return parseFloat(apr) * 100; // Convert to percentage
  } catch (e) {
    return 0;
  }
}

/**
 * Get user's LP token balance for a specific pool
 */
export async function getUserLpBalance(
  poolInfo: PoolInfo,
  userWallet: PublicKey
): Promise<number> {
  try {
    const connection = ConnectionService.getInstance().getConnection();
    const lpMintPubkey = new PublicKey(poolInfo.lpMint);

    // Fetch all token accounts owned by the user
    const tokenAccountsResponse =
      await connection.getParsedTokenAccountsByOwner(userWallet, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      });

    // Find the LP token account
    const lpAccount = tokenAccountsResponse.value.find(
      (account) => account.account.data.parsed.info.mint === poolInfo.lpMint
    );

    if (!lpAccount) {
      return 0;
    }

    // Get balance and decimals
    const balance =
      lpAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
    return balance;
  } catch (error) {
    console.error("Error fetching LP balance:", error);
    return 0;
  }
}

/**
 * Add liquidity to a Raydium pool
 */
export async function depositToRaydiumPool(
  poolInfo: PoolInfo,
  userWallet: PublicKey,
  amountA: number,
  amountB: number
): Promise<Transaction> {
  const connection = ConnectionService.getInstance().getConnection();

  // Validate pool info has the required poolKeys
  if (!poolInfo.poolKeys) {
    throw new Error("Pool keys not available");
  }

  // Get user token accounts
  const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
    userWallet,
    { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
  );

  // Find base and quote token accounts
  const baseTokenAccount = tokenAccountsResponse.value.find(
    (acc) =>
      acc.account.data.parsed.info.mint ===
      poolInfo.poolKeys!.baseMint.toString()
  );

  const quoteTokenAccount = tokenAccountsResponse.value.find(
    (acc) =>
      acc.account.data.parsed.info.mint ===
      poolInfo.poolKeys!.quoteMint.toString()
  );

  if (!baseTokenAccount || !quoteTokenAccount) {
    throw new Error(
      "Token accounts not found. Make sure you have both tokens in your wallet."
    );
  }

  // Convert amounts to base units based on token decimals
  const baseAmountRaw = Math.floor(
    amountA * Math.pow(10, poolInfo.baseDecimals)
  );
  const quoteAmountRaw = Math.floor(
    amountB * Math.pow(10, poolInfo.quoteDecimals)
  );

  // Create token amount objects
  const baseAmount = {
    currency: {
      decimals: poolInfo.baseDecimals,
      mint: new PublicKey(poolInfo.poolKeys.baseMint),
      symbol: poolInfo.base,
    },
    amount: new BN(baseAmountRaw),
  };

  const quoteAmount = {
    currency: {
      decimals: poolInfo.quoteDecimals,
      mint: new PublicKey(poolInfo.poolKeys.quoteMint),
      symbol: poolInfo.quote,
    },
    amount: new BN(quoteAmountRaw),
  };

  // Max slippage 0.5%
  const slippage = new Decimal(0.005);

  try {
    // Use Raydium SDK to create deposit instruction
    const { innerTransaction } = await Liquidity.makeDepositInstruction({
      connection,
      poolKeys: poolInfo.poolKeys,
      userKeys: {
        tokenAccounts: tokenAccountsResponse.value.map(
          ({ pubkey, account }) => ({
            pubkey,
            accountInfo: account,
          })
        ),
        owner: userWallet,
      },
      amountInA: baseAmount,
      amountInB: quoteAmount,
      fixedSide: "a",
      slippage,
    });

    // Create transaction with deposit instructions
    const transaction = new Transaction();
    innerTransaction.instructions.forEach((instruction) => {
      transaction.add(instruction);
    });

    return transaction;
  } catch (error: any) {
    console.error("Error creating deposit instruction:", error);
    throw new Error(`Failed to create deposit transaction: ${error.message}`);
  }
}

/**
 * Remove liquidity from a Raydium pool
 */
export async function withdrawFromRaydiumPool(
  poolInfo: PoolInfo,
  userWallet: PublicKey,
  lpAmount: number
): Promise<Transaction> {
  const connection = ConnectionService.getInstance().getConnection();

  // Validate pool info has the required poolKeys
  if (!poolInfo.poolKeys) {
    throw new Error("Pool keys not available");
  }

  // Get user token accounts
  const tokenAccountsResponse = await connection.getParsedTokenAccountsByOwner(
    userWallet,
    { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
  );

  // Find LP token account
  const lpTokenAccount = tokenAccountsResponse.value.find(
    (acc) =>
      acc.account.data.parsed.info.mint === poolInfo.poolKeys!.lpMint.toString()
  );

  if (!lpTokenAccount) {
    throw new Error(
      "LP token account not found. Make sure you have LP tokens in your wallet."
    );
  }

  // Convert LP amount to base units (9 decimals for LP tokens)
  const lpDecimals = 9; // LP tokens typically have 9 decimals
  const lpAmountRaw = Math.floor(lpAmount * Math.pow(10, lpDecimals));

  // Create LP token amount object
  const lpTokenAmount = {
    currency: {
      decimals: lpDecimals,
      mint: new PublicKey(poolInfo.poolKeys.lpMint),
      symbol: "LP",
    },
    amount: new BN(lpAmountRaw),
  };

  // Max slippage 0.5%
  const slippage = new Decimal(0.005);

  try {
    // Use Raydium SDK to create withdraw instruction
    const { innerTransaction } = await Liquidity.makeWithdrawInstruction({
      connection,
      poolKeys: poolInfo.poolKeys,
      userKeys: {
        tokenAccounts: tokenAccountsResponse.value.map(
          ({ pubkey, account }) => ({
            pubkey,
            accountInfo: account,
          })
        ),
        owner: userWallet,
      },
      amountIn: lpTokenAmount,
      slippage,
    });

    // Create transaction with withdraw instructions
    const transaction = new Transaction();
    innerTransaction.instructions.forEach((instruction) => {
      transaction.add(instruction);
    });

    return transaction;
  } catch (error: any) {
    console.error("Error creating withdraw instruction:", error);
    throw new Error(`Failed to create withdraw transaction: ${error.message}`);
  }
}

/**
 * Collect rewards from a Raydium farm
 */
export async function collectRewards(
  poolInfo: PoolInfo,
  userWallet: PublicKey
): Promise<Transaction | null> {
  if (!poolInfo.farmId) {
    throw new Error("This pool does not have an associated farm for rewards");
  }

  // For now, due to complexity of Raydium farm interactions, return null
  // In a real implementation, you would:
  // 1. Use Raydium's Farm SDK to create a harvest instruction
  // 2. Create a transaction with the harvest instruction

  throw new Error(
    "Reward collection is not yet implemented. Use Raydium's UI for claiming rewards."
  );
}

import {
  Transaction,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Liquidity, Farm } from "@raydium-io/raydium-sdk";
import { ConnectionService } from "../services/connection";

export type PoolInfo = {
  name: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  poolKeys: any; // from Raydium JSON
  farmKeys?: any; // from Raydium Farm info JSON
};

export async function getRaydiumPools(): Promise<PoolInfo[]> {
  // Fetch ON‑chain pool and farm metadata
  const [liquidityList, farmList] = await Promise.all([
    fetch(RAYDIUM_LIQUIDITY_JSON!).then((r) => r.json()),
    fetch(RAYDIUM_FARM_INFO)
      .then((r) => r.json())
      .then((j) => j.official),
  ]);

  // Map farm APR & keys
  const farmMap = Object.fromEntries(
    farmList.map((f: any) => [f.lpMint, { ...f }])
  );

  return liquidityList.map((p: any) => ({
    name: p.name,
    baseMint: p.baseMint,
    quoteMint: p.quoteMint,
    lpMint: p.lpMint,
    poolKeys: p, // contains all AMM keys
    farmKeys: farmMap[p.lpMint],
  }));
}

// Build deposit transaction
export async function buildDepositTx(
  pool: PoolInfo,
  user: PublicKey,
  amountA: number,
  amountB: number
): Promise<Transaction> {
  const connection = ConnectionService.getConnection();
  const tx = new Transaction();
  const ix = await Liquidity.makeDepositInstruction(
    connection,
    pool.poolKeys,
    user,
    {
      maxCoinAmount: BigInt(
        Math.floor(amountA * 10 ** pool.poolKeys.baseDecimals)
      ),
      maxPcAmount: BigInt(
        Math.floor(amountB * 10 ** pool.poolKeys.quoteDecimals)
      ),
      slippage: 0.005,
    }
  );
  tx.add(ix);
  return tx;
}

// Build withdraw transaction
export async function buildWithdrawTx(
  pool: PoolInfo,
  user: PublicKey,
  lpAmount: number
): Promise<Transaction> {
  const connection = ConnectionService.getConnection();
  const tx = new Transaction();
  const ix = await Liquidity.makeWithdrawInstruction(
    connection,
    pool.poolKeys,
    user,
    {
      amount: BigInt(Math.floor(lpAmount * 10 ** pool.poolKeys.lpDecimals)),
      slippage: 0.005,
    }
  );
  tx.add(ix);
  return tx;
}

// Build harvest transaction
export async function buildHarvestTx(
  pool: PoolInfo,
  user: PublicKey
): Promise<Transaction> {
  if (!pool.farmKeys) {
    throw new Error("No farm info available for this pool");
  }
  const connection = ConnectionService.getConnection();
  const tx = new Transaction();
  const ix = await Farm.makeHarvestInstruction(connection, pool.farmKeys, user);
  tx.add(ix);
  return tx;
}

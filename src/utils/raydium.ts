import { TransactionInstruction, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Raydium AMM program ID (for standard constant-product AMM)
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey(
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
);

// Define the structure of a pool info object
export type PoolInfo = {
  id: string;
  name: string; // e.g. "SOL-USDC"
  baseMint: string;
  base: string; // symbol for base token
  quoteMint: string;
  quote: string; // symbol for quote token
  lpMint: string;
  liquidity: number; // TVL in USD
  apr: number; // combined fee and farm APR
  // These additional fields are required for on-chain deposit instructions:
  ammAuthority: string;
  ammOpenOrders: string;
  ammTargetOrders: string;
  baseVault: string;
  quoteVault: string;
  serumMarket: string;
  serumEventQueue: string;
};

// Fetch pool info from Raydium endpoints
export async function getRaydiumPoolInfo(): Promise<PoolInfo[]> {
  const pairsRes = await fetch("https://api.raydium.io/v2/main/pairs");
  const pairs: any[] = await pairsRes.json();
  const farmRes = await fetch("https://api.raydium.io/v2/main/farm/info");
  const farmData = await farmRes.json();
  const farms: any[] = farmData.official || [];

  const farmAprMap: Record<string, number> = {};
  farms.forEach((farm) => {
    const apr = farm.aprPct ?? 0;
    farmAprMap[farm.lpMint] = apr;
  });

  // Combine pool fee APR (using 24h fee APR) with farm APR
  return pairs.map((pool) => {
    const feeApr = pool.apr24h || 0;
    const farmApr = farmAprMap[pool.lpMint] || 0;
    return {
      id: pool.id,
      name: pool.name,
      baseMint: pool.baseMint,
      base: pool.base,
      quoteMint: pool.quoteMint,
      quote: pool.quote,
      lpMint: pool.lpMint,
      liquidity: pool.liquidity,
      apr: feeApr + farmApr,
      // Additional on-chain data is assumed to be present (in practice, merge with Raydium’s liquidity pool JSON)
      ammAuthority: pool.ammAuthority,
      ammOpenOrders: pool.ammOpenOrders,
      ammTargetOrders: pool.ammTargetOrders,
      baseVault: pool.baseVault,
      quoteVault: pool.quoteVault,
      serumMarket: pool.serumMarket,
      serumEventQueue: pool.serumEventQueue,
    };
  });
}

// Construct a deposit instruction for adding liquidity to a pool.
// Assumes that the user’s associated token accounts already exist.
export async function depositToRaydiumPool(
  pool: PoolInfo,
  user: PublicKey,
  amountA: number,
  amountB: number
): Promise<TransactionInstruction> {
  // In a real implementation, you should retrieve the user’s associated token accounts.
  // For brevity, we assume that you have obtained these addresses.
  // Replace the following placeholders with actual associated token account PublicKey values.
  const userBaseATA = new PublicKey(
    "ReplaceUserBaseTokenATA111111111111111111111"
  );
  const userQuoteATA = new PublicKey(
    "ReplaceUserQuoteTokenATA11111111111111111111"
  );
  const userLpATA = new PublicKey(
    "ReplaceUserLPTokenATA11111111111111111111111"
  );

  // Convert the deposit amounts to atomic units (assume 9 decimals for base and 6 decimals for quote)
  const maxCoinAmount = BigInt(Math.floor(amountA * 1e9));
  const maxPcAmount = BigInt(Math.floor(amountB * 1e6));
  const MAX_U64 = BigInt("0xffffffffffffffff");
  const baseSide = BigInt(0);

  // Prepare instruction data buffer (3 x 8 bytes)
  const data = Buffer.alloc(24);
  data.writeBigUInt64LE(maxCoinAmount < MAX_U64 ? maxCoinAmount : MAX_U64, 0);
  data.writeBigUInt64LE(maxPcAmount < MAX_U64 ? maxPcAmount : MAX_U64, 8);
  data.writeBigUInt64LE(baseSide, 16);

  const keys = [
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(pool.id), isSigner: false, isWritable: true },
    {
      pubkey: new PublicKey(pool.ammAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: new PublicKey(pool.ammOpenOrders),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: new PublicKey(pool.ammTargetOrders),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: new PublicKey(pool.lpMint), isSigner: false, isWritable: true },
    {
      pubkey: new PublicKey(pool.baseVault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(pool.quoteVault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(pool.serumMarket),
      isSigner: false,
      isWritable: false,
    },
    { pubkey: userBaseATA, isSigner: false, isWritable: true },
    { pubkey: userQuoteATA, isSigner: false, isWritable: true },
    { pubkey: userLpATA, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: false },
    {
      pubkey: new PublicKey(pool.serumEventQueue),
      isSigner: false,
      isWritable: false,
    },
  ];

  return new TransactionInstruction({
    programId: RAYDIUM_AMM_PROGRAM_ID,
    keys,
    data,
  });
}

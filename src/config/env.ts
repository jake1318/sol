export const ENV = import.meta.env.VITE_APP_ENVIRONMENT || "production";

export const SOLANA_RPC = {
  development: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  production: "https://api.mainnet-beta.solana.com",
}[ENV];

export const JUPITER_API = {
  quote: "https://quote-api.jup.ag/v6/quote",
  swap: "https://quote-api.jup.ag/v6/swap",
  trigger: "https://api.jup.ag/trigger/v1",
};

export const RAYDIUM_LIQUIDITY_JSON =
  ENV === "production"
    ? "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"
    : "https://api.raydium.io/v2/sdk/liquidity/mainnet.json"; // no devnet pools

export const RAYDIUM_FARM_INFO = "https://api.raydium.io/v2/main/farm/info";

export const BIRDEYE_API_URL = "https://public-api.birdeye.so/public";
export const BIRDEYE_API_KEY = import.meta.env.VITE_BIRDEYE_API_KEY!;

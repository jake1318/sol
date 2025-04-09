/**
 * Environment configuration for the application
 * Supports development, testnet, and production (mainnet) environments
 */

// Environment types
export type Environment = "development" | "testnet" | "production";

// Determine current environment
// Default to development unless explicitly set to production
export const getCurrentEnvironment = (): Environment => {
  const env = import.meta.env.VITE_APP_ENVIRONMENT || "development";
  if (["development", "testnet", "production"].includes(env)) {
    return env as Environment;
  }
  console.warn(`Unknown environment ${env}, falling back to development`);
  return "development";
};

// RPC endpoints configuration with fallbacks
interface RPCConfig {
  primary: string;
  fallbacks: string[];
}

const RPC_ENDPOINTS: Record<Environment, RPCConfig> = {
  development: {
    primary: "https://api.devnet.solana.com",
    fallbacks: [
      "https://devnet.genesysgo.net",
      "https://api.metaplex.solana.com",
    ],
  },
  testnet: {
    primary: "https://api.testnet.solana.com",
    fallbacks: ["https://testnet.genesysgo.net"],
  },
  production: {
    primary: "https://api.mainnet-beta.solana.com",
    fallbacks: [
      "https://solana-api.projectserum.com",
      "https://mainnet.rpcpool.com",
      "https://ssc-dao.genesysgo.net",
    ],
  },
};

// Get all RPC endpoints for current environment
export const getRpcEndpoints = (): RPCConfig => {
  const env = getCurrentEnvironment();
  return RPC_ENDPOINTS[env];
};

// API endpoints for Jupiter and Raydium based on environment
interface APIEndpoints {
  jupiter: {
    quoteApi: string;
    swapApi: string;
  };
  raydium: {
    poolInfoApi: string;
  };
}

const API_ENDPOINTS: Record<Environment, APIEndpoints> = {
  development: {
    jupiter: {
      quoteApi: "https://quote-api.jup.ag/v6/quote",
      swapApi: "https://quote-api.jup.ag/v6/swap",
    },
    raydium: {
      poolInfoApi: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json", // Using mainnet data for dev too as devnet has limited pools
    },
  },
  testnet: {
    jupiter: {
      quoteApi: "https://quote-api.jup.ag/v6/quote",
      swapApi: "https://quote-api.jup.ag/v6/swap",
    },
    raydium: {
      poolInfoApi: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",
    },
  },
  production: {
    jupiter: {
      quoteApi: "https://quote-api.jup.ag/v6/quote",
      swapApi: "https://quote-api.jup.ag/v6/swap",
    },
    raydium: {
      poolInfoApi: "https://api.raydium.io/v2/sdk/liquidity/mainnet.json",
    },
  },
};

// Get API endpoints for the current environment
export const getApiEndpoints = (): APIEndpoints => {
  const env = getCurrentEnvironment();
  return API_ENDPOINTS[env];
};

// Get a display name for the current environment (useful for UI indicators)
export const getEnvironmentName = (): string => {
  const env = getCurrentEnvironment();
  switch (env) {
    case "development":
      return "Development (Devnet)";
    case "testnet":
      return "Testnet";
    case "production":
      return "Production (Mainnet)";
    default:
      return "Unknown Environment";
  }
};

// Check if we're in a live environment (production)
export const isProduction = (): boolean => {
  return getCurrentEnvironment() === "production";
};

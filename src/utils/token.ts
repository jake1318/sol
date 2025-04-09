import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

// Get the associated token address for a wallet and mint
export async function getUserTokenAccount(
  wallet: PublicKey,
  mint: PublicKey
): Promise<PublicKey> {
  return await getAssociatedTokenAddress(mint, wallet);
}

import axios from "axios";
import { BIRDEYE_API_URL, BIRDEYE_API_KEY } from "../config/env";

// Fetch USD price for a given SPL token mint via Birdeye
export async function fetchTokenPriceUSD(mintAddress: string): Promise<number> {
  const url = `${BIRDEYE_API_URL}/price?address=${mintAddress}`;
  const res = await axios.get(url, {
    headers: { "x-api-key": BIRDEYE_API_KEY },
  });
  // Birdeye returns { data: { price: number, ... } }
  return res.data.data.price as number;
}

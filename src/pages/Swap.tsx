import React, { useState } from "react";
import { useJupiterSwap } from "../hooks/useJupiterSwap";
import { fetchTokenPriceUSD } from "../utils/birdeye";

const Swap: React.FC = () => {
  const [inMint, setInMint] = useState(
    "So11111111111111111111111111111111111111112"
  );
  const [outMint, setOutMint] = useState(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const [amt, setAmt] = useState("");
  const [slip, setSlip] = useState(50);
  const { swap, loading } = useJupiterSwap();
  const [priceUSD, setPriceUSD] = useState<number | null>(null);

  const handleSwap = async () => {
    const a = parseFloat(amt);
    if (!a) return alert("Invalid amount");
    try {
      const sig = await swap(inMint, outMint, a, slip);
      alert("Swap success: " + sig);
      // fetch price
      const p = await fetchTokenPriceUSD(outMint);
      setPriceUSD(p);
    } catch (e: any) {
      alert("Swap failed: " + e.message);
    }
  };

  return (
    <div className="swap-page">
      <h2>Token Swap</h2>
      <label>
        From:
        <input
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="0.0"
        />
        <select value={inMint} onChange={(e) => setInMint(e.target.value)}>
          <option value="So11111111111111111111111111111111111111112">
            SOL
          </option>
          <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
            USDC
          </option>
        </select>
      </label>
      <label>
        To:
        <select value={outMint} onChange={(e) => setOutMint(e.target.value)}>
          <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
            USDC
          </option>
          <option value="So11111111111111111111111111111111111111112">
            SOL
          </option>
        </select>
      </label>
      <label>
        Slippage (bps):
        <input
          type="number"
          value={slip}
          onChange={(e) => setSlip(+e.target.value)}
        />
      </label>
      <button onClick={handleSwap} disabled={loading}>
        {loading ? "Swapping…" : "Swap"}
      </button>
      {priceUSD && <p>Output token price: ${priceUSD.toFixed(4)}</p>}
    </div>
  );
};

export default Swap;

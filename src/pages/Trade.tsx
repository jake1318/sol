import React, { useState } from "react";
import { useJupiterTrigger } from "../hooks/useJupiterTrigger";

const Trade: React.FC = () => {
  const [inMint, setInMint] = useState(
    "So11111111111111111111111111111111111111112"
  );
  const [outMint, setOutMint] = useState(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const [sell, setSell] = useState("");
  const [buy, setBuy] = useState("");
  const [expiry, setExpiry] = useState("");
  const { placeOrder, loading } = useJupiterTrigger();

  const handle = async () => {
    try {
      const res = await placeOrder(
        inMint,
        outMint,
        parseFloat(sell),
        parseFloat(buy),
        expiry ? parseInt(expiry) : undefined
      );
      alert(`Order ${res.order} placed! Tx: ${res.tx}`);
    } catch (e: any) {
      alert("Order failed: " + e.message);
    }
  };

  return (
    <div className="trade-page">
      <h2>Limit Order</h2>
      <label>
        Sell:
        <input
          value={sell}
          onChange={(e) => setSell(e.target.value)}
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
        Buy Min:
        <input
          value={buy}
          onChange={(e) => setBuy(e.target.value)}
          placeholder="0.0"
        />
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
        Expiry (Unix):
        <input
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          placeholder="1712500000"
        />
      </label>
      <button onClick={handle} disabled={loading}>
        {loading ? "Placing…" : "Place Order"}
      </button>
    </div>
  );
};

export default Trade;

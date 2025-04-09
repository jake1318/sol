import { useState } from "react";
import { useJupiterTrigger } from "../hooks/useJupiterTrigger";

const Trade: React.FC = () => {
  const [inputMint, setInputMint] = useState(
    "So11111111111111111111111111111111111111112"
  );
  const [outputMint, setOutputMint] = useState(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");
  const [expiry, setExpiry] = useState("");
  const { placeLimitOrder, loading } = useJupiterTrigger();

  const handlePlaceOrder = async () => {
    try {
      const sellAmt = parseFloat(sellAmount);
      const buyAmt = parseFloat(buyAmount);
      if (isNaN(sellAmt) || isNaN(buyAmt) || sellAmt <= 0 || buyAmt <= 0) {
        alert("Enter valid amounts");
        return;
      }
      const expiryNum = expiry ? parseInt(expiry) : undefined;
      const result = await placeLimitOrder(
        inputMint,
        outputMint,
        sellAmt,
        buyAmt,
        expiryNum
      );
      alert(
        `Limit order placed! Order PubKey: ${result.order}\nTxID: ${result.txid}`
      );
    } catch (err: any) {
      alert(`Order placement failed: ${err.message}`);
    }
  };

  return (
    <div className="trade-page">
      <h2>Place Limit Order</h2>
      <div className="trade-form">
        <label>
          Sell Token:
          <select
            value={inputMint}
            onChange={(e) => setInputMint(e.target.value)}
          >
            <option value="So11111111111111111111111111111111111111112">
              SOL
            </option>
            <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
              USDC
            </option>
          </select>
        </label>
        <label>
          Buy Token:
          <select
            value={outputMint}
            onChange={(e) => setOutputMint(e.target.value)}
          >
            <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
              USDC
            </option>
            <option value="So11111111111111111111111111111111111111112">
              SOL
            </option>
          </select>
        </label>
        <label>
          Sell Amount:
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            placeholder="0.0"
          />
        </label>
        <label>
          Minimum Buy Amount:
          <input
            type="number"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            placeholder="0.0"
          />
        </label>
        <label>
          Expiry (Unix time, optional):
          <input
            type="number"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            placeholder="e.g. 1712500000"
          />
        </label>
        <button onClick={handlePlaceOrder} disabled={loading}>
          {loading ? "Placing Order…" : "Place Order"}
        </button>
      </div>
    </div>
  );
};

export default Trade;

import { useState } from "react";
import { useJupiterSwap } from "../hooks/useJupiterSwap";

const Swap: React.FC = () => {
  const [inputMint, setInputMint] = useState(
    "So11111111111111111111111111111111111111112"
  );
  const [outputMint, setOutputMint] = useState(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );
  const [amount, setAmount] = useState<string>("");
  const [slippageBps, setSlippageBps] = useState(50);
  const { executeSwap, loading } = useJupiterSwap();

  const handleSwap = async () => {
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) {
        alert("Enter a valid amount");
        return;
      }
      const txid = await executeSwap(inputMint, outputMint, amt, slippageBps);
      alert(`Swap successful! TxID: ${txid}`);
    } catch (err: any) {
      alert(`Swap failed: ${err.message}`);
    }
  };

  return (
    <div className="swap-page">
      <h2>Token Swap</h2>
      <div className="swap-form">
        <label>
          From:
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
          To:
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
          Amount:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
          />
        </label>
        <label>
          Slippage (bps):
          <input
            type="number"
            value={slippageBps}
            onChange={(e) => setSlippageBps(Number(e.target.value))}
          />
        </label>
        <button onClick={handleSwap} disabled={loading}>
          {loading ? "Swapping…" : "Swap"}
        </button>
      </div>
    </div>
  );
};

export default Swap;

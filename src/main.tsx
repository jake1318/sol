// Polyfill Node buffer in the browser
import { Buffer } from "buffer";
(window as any).Buffer = Buffer;

import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  UnifiedWalletProvider,
  WalletAdapterNetwork,
} from "@jup-ag/wallet-adapter";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import App from "./App";
import "./styles/globals.scss";
import "./styles/theme.scss";
import "./styles/components.scss";

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new TorusWalletAdapter(),
];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <UnifiedWalletProvider
    wallets={wallets}
    config={{
      env: "mainnet",
      autoConnect: false,
      theme: "dark",
      metadata: {
        name: "Cypherpunk DApp",
        description: "Solana DeFi App",
        iconUrls: [],
      },
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </UnifiedWalletProvider>
);

import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Swap from "./pages/Swap";
import Trade from "./pages/Trade";
import Pools from "./pages/Pools";
import { WalletConnect } from "./components/WalletConnect";

const App: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Cypherpunk DeFi</h1>
        <nav>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/swap">Swap</NavLink>
          <NavLink to="/trade">DEX</NavLink>
          <NavLink to="/pools">LP Pools</NavLink>
        </nav>
        <WalletConnect />
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/swap" element={<Swap />} />
          <Route path="/trade" element={<Trade />} />
          <Route path="/pools" element={<Pools />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

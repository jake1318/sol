// src/pages/Home.tsx
import React from "react";

const Home: React.FC = () => {
  return (
    <div className="home-page">
      <h2>Welcome to Cypherpunk DeFi</h2>
      <p>
        This is a Solana-powered decentralized finance application demonstrating
        token swaps, limit orders, and yield farming in a futuristic interface.
      </p>
      <p>Use the navigation above to explore the features.</p>
    </div>
  );
};

export default Home;

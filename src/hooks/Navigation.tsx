import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useWallet } from "../contexts/WalletContext";
import "./Navigation.scss";

const Navigation: React.FC = () => {
  const { connected } = useWallet();
  const [open, setOpen] = useState(false);
  return (
    <nav className="cyber-nav">
      <div className="container">
        <button
          className={`mobile-toggle ${open ? "active" : ""}`}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
        <ul className={open ? "links mobile-open" : "links"}>
          <li>
            <NavLink to="/">◉ Home</NavLink>
          </li>
          {connected ? (
            <>
              <li>
                <NavLink to="/swap">⇄ Swap</NavLink>
              </li>
              <li>
                <NavLink to="/trade">⊞ DEX</NavLink>
              </li>
              <li>
                <NavLink to="/pools">⦿ Pools</NavLink>
              </li>
            </>
          ) : (
            <>
              <li className="disabled">⇄ Swap</li>
              <li className="disabled">⊞ DEX</li>
              <li className="disabled">⦿ Pools</li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;

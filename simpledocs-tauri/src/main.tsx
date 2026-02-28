import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found!");
console.log("React mounting...");

ReactDOM.createRoot(rootEl).render(
    <React.StrictMode><App /></React.StrictMode>
);
console.log("React mounted ✓");

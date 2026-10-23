import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import StandaloneApp from "./StandaloneApp";
import "./standalone.css";


import "./standalone/shell.css";
import "./standalone/layout.css";
document.body.classList.add("dataspace-standalone");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StandaloneApp />
  </StrictMode>
);

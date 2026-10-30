import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "../styles.css";

function Theme() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.remove("light", "dark");
      root.classList.add(dark ? "dark" : "light");
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme />
  </StrictMode>,
);

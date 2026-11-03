import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "../styles.css";

/** Dark is the default, including on a light OS theme. */
function Theme() {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Theme />
  </StrictMode>,
);

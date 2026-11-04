import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export default function DevtoolsPanels() {
  return (
    <>
      <TanStackRouterDevtools />
      <ReactQueryDevtools />
    </>
  );
}

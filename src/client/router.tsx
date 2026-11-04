import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { capturePageview, onResolvedPageview } from "./analytics";
import { queryClient } from "./query-client";
import { routeTree } from "./routes";

declare module "@tanstack/history" {
  interface HistoryState {
    returnToRaid?: boolean;
    offsetText?: string;
  }
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0,
});

router.subscribe("onResolved", (event) => {
  if (onResolvedPageview(event.pathChanged, event.fromLocation)) capturePageview();
});

export function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

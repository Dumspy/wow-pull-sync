import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import type { QueryClient } from "@tanstack/react-query";

import { DesignGallery } from "./design-gallery";
import { Devtools } from "./devtools";
import { PastePage } from "./paste-page";
import { pullsQueryOptions, REQUEST_OFFSET_SECONDS } from "./pulls-query";
import { RaidPage } from "./raid-page";
import { RaidLinkError, raidSearchSchema, searchForPull, type RaidSearch } from "./raid-search";
import { LoadingRaid, RouteFailure } from "./route-status";

export interface RouterContext {
  queryClient: QueryClient;
}

const reportCodeSchema = z.string().regex(/^[A-Za-z0-9]+$/);

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteFailure,
  notFoundComponent: MissingPage,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Devtools />
    </>
  );
}

function MissingPage() {
  return <RouteFailure error={new Error("That page doesn't exist.")} reset={() => undefined} />;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: PastePage,
});

const raidRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid/$reportCode",
  validateSearch: raidSearchSchema,
  params: {
    parse: (params) => {
      const code = reportCodeSchema.safeParse(params.reportCode);

      if (!code.success) throw new RaidLinkError();

      return { reportCode: code.data };
    },
    stringify: (params) => ({ reportCode: params.reportCode }),
  },
  loaderDeps: ({ search }) => ({ vod: search.vod }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      pullsQueryOptions(params.reportCode, deps.vod, REQUEST_OFFSET_SECONDS),
    ),
  pendingComponent: LoadingRaid,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: RouteFailure,
  component: RaidRoute,
});

function RaidRoute() {
  const search = raidRoute.useSearch();
  const { reportCode } = raidRoute.useParams();
  const navigate = raidRoute.useNavigate();

  const initialOffsetText = useRouterState({
    select: (state) => state.location.state.offsetText ?? "0",
  });

  const { data } = useSuspenseQuery(
    pullsQueryOptions(reportCode, search.vod, REQUEST_OFFSET_SECONDS),
  );

  const onSelectPull = useCallback(
    (fightId: number, seconds: number | null) => {
      void navigate({ search: (prev) => searchForPull(prev, fightId, seconds) });
    },
    [navigate],
  );

  const onReplaceSearch = useCallback(
    (next: RaidSearch) => {
      void navigate({ replace: true, search: next });
    },
    [navigate],
  );

  const onAnotherRaid = useCallback(
    (offsetText: string) => {
      void navigate({ to: "/", state: { returnToRaid: true, offsetText } });
    },
    [navigate],
  );

  return (
    <RaidPage
      data={data}
      search={search}
      initialOffsetText={initialOffsetText}
      onSelectPull={onSelectPull}
      onReplaceSearch={onReplaceSearch}
      onAnotherRaid={onAnotherRaid}
    />
  );
}

const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/design",
  component: DesignGallery,
});

export const routeTree = rootRoute.addChildren([indexRoute, raidRoute, designRoute]);

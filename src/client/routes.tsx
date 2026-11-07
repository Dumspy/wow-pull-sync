import { useSuspenseQueries } from "@tanstack/react-query";
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
import { RaidPage } from "./raid-page";
import { reportQueryOptions, vodQueryOptions } from "./raid-queries";
import {
  RaidLinkError,
  raidSearchSchema,
  raidViewSearchSchema,
  searchForPull,
  type RaidSearch,
} from "./raid-search";
import { BossProgressPage, OverviewPage } from "./raid-views";
import { LoadingRaid, NotFoundPage, RouteFailure } from "./route-status";

export interface RouterContext {
  queryClient: QueryClient;
}

const reportCodeSchema = z.string().regex(/^[A-Za-z0-9]+$/);

/** Loads the report and the VOD side by side; they are separate requests. */
function loadRaid(queryClient: QueryClient, reportCode: string, vod: string) {
  return Promise.all([
    queryClient.ensureQueryData(reportQueryOptions(reportCode)),
    queryClient.ensureQueryData(vodQueryOptions(vod)),
  ]);
}

function useRaid(reportCode: string, vod: string) {
  const [report, video] = useSuspenseQueries({
    queries: [reportQueryOptions(reportCode), vodQueryOptions(vod)],
  });

  return { report: report.data, vod: video.data };
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteFailure,
  notFoundComponent: NotFoundPage,
});

function RootLayout() {
  return (
    <>
      <Outlet />
      <Devtools />
    </>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: PastePage,
});

const reportParams = {
  parse: (params: { reportCode: string }) => {
    const code = reportCodeSchema.safeParse(params.reportCode);

    if (!code.success) throw new RaidLinkError();

    return { reportCode: code.data };
  },
  stringify: (params: { reportCode: string }) => ({ reportCode: params.reportCode }),
};

const raidRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid/$reportCode",
  validateSearch: raidSearchSchema,
  params: reportParams,
  loaderDeps: ({ search }) => ({ vod: search.vod }),
  loader: ({ context, params, deps }) => loadRaid(context.queryClient, params.reportCode, deps.vod),
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

  const { report, vod } = useRaid(reportCode, search.vod);

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
      report={report}
      vod={vod}
      search={search}
      initialOffsetText={initialOffsetText}
      onSelectPull={onSelectPull}
      onReplaceSearch={onReplaceSearch}
      onAnotherRaid={onAnotherRaid}
    />
  );
}

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid/$reportCode/overview",
  validateSearch: raidViewSearchSchema,
  params: reportParams,
  loaderDeps: ({ search }) => ({ vod: search.vod }),
  loader: ({ context, params, deps }) => loadRaid(context.queryClient, params.reportCode, deps.vod),
  pendingComponent: LoadingRaid,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: RouteFailure,
  component: OverviewRoute,
});

function OverviewRoute() {
  const search = overviewRoute.useSearch();
  const { reportCode } = overviewRoute.useParams();

  const { report, vod } = useRaid(reportCode, search.vod);

  return <OverviewPage report={report} vod={vod} search={search} />;
}

const bossRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid/$reportCode/boss/$encounterId",
  validateSearch: raidViewSearchSchema,
  params: {
    parse: (params) => {
      const encounterId = z.coerce.number().int().safeParse(params.encounterId);

      if (!encounterId.success) throw new RaidLinkError();

      return { ...reportParams.parse(params), encounterId: encounterId.data };
    },
    stringify: (params) => ({
      reportCode: params.reportCode,
      encounterId: String(params.encounterId),
    }),
  },
  loaderDeps: ({ search }) => ({ vod: search.vod }),
  loader: ({ context, params, deps }) => loadRaid(context.queryClient, params.reportCode, deps.vod),
  pendingComponent: LoadingRaid,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: RouteFailure,
  component: BossRoute,
});

function BossRoute() {
  const search = bossRoute.useSearch();
  const { reportCode, encounterId } = bossRoute.useParams();

  const { report, vod } = useRaid(reportCode, search.vod);

  return <BossProgressPage report={report} vod={vod} search={search} encounterId={encounterId} />;
}

const designRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/design",
  component: DesignGallery,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  raidRoute,
  overviewRoute,
  bossRoute,
  designRoute,
]);

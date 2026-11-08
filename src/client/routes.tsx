import { useSuspenseQuery } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, Outlet } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";

import type { QueryClient } from "@tanstack/react-query";

import { DesignGallery } from "./design-gallery";
import { Devtools } from "./devtools";
import { PastePage } from "./paste-page";
import { RaidPage } from "./raid-page";
import { reportQueryOptions, vodQueryOptions } from "./raid-queries";
import { vodRef } from "./raid-vods";
import { AddVodPage } from "./add-vod-page";
import {
  addVodSearchSchema,
  RaidLinkError,
  raidSearchSchema,
  raidViewSearchSchema,
  searchForPull,
  searchWithVod,
  type RaidSearch,
  type SearchVod,
} from "./raid-search";
import { BossProgressPage, OverviewPage } from "./raid-views";
import { LoadingRaid, NotFoundPage, RouteFailure } from "./route-status";
import type { VodRef } from "../urls";

export interface RouterContext {
  queryClient: QueryClient;
}

const reportCodeSchema = z.string().regex(/^[A-Za-z0-9]+$/);

/**
 * Loads the report and every VOD side by side. Only the report can fail the page; a VOD
 * that fails shows its own state in the inspector.
 */
async function loadRaid(queryClient: QueryClient, reportCode: string, vods: VodRef[]) {
  await Promise.all([
    queryClient.ensureQueryData(reportQueryOptions(reportCode)),
    ...vods.map((vod) => queryClient.prefetchQuery(vodQueryOptions(vod))),
  ]);
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
  loaderDeps: ({ search }) => ({ vods: search.vods.map(vodRef) }),
  loader: ({ context, params, deps }) =>
    loadRaid(context.queryClient, params.reportCode, deps.vods),
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

  const { data: report } = useSuspenseQuery(reportQueryOptions(reportCode));

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

  const onAddVod = useCallback(
    (replace: number | null) => {
      void navigate({
        to: "/raid/$reportCode/add-vod",
        search: (prev) => (replace == null ? prev : { ...prev, replace }),
      });
    },
    [navigate],
  );

  const onAnotherRaid = useCallback(() => {
    void navigate({ to: "/", state: { returnToRaid: true } });
  }, [navigate]);

  return (
    <RaidPage
      report={report}
      search={search}
      onSelectPull={onSelectPull}
      onReplaceSearch={onReplaceSearch}
      onAddVod={onAddVod}
      onAnotherRaid={onAnotherRaid}
    />
  );
}

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid/$reportCode/overview",
  validateSearch: raidViewSearchSchema,
  params: reportParams,
  loaderDeps: ({ search }) => ({ vods: search.vods.map(vodRef) }),
  loader: ({ context, params, deps }) =>
    loadRaid(context.queryClient, params.reportCode, deps.vods),
  pendingComponent: LoadingRaid,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: RouteFailure,
  component: OverviewRoute,
});

function OverviewRoute() {
  const search = overviewRoute.useSearch();
  const { reportCode } = overviewRoute.useParams();

  const { data: report } = useSuspenseQuery(reportQueryOptions(reportCode));

  return <OverviewPage report={report} search={search} />;
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
  loaderDeps: ({ search }) => ({ vods: search.vods.map(vodRef) }),
  loader: ({ context, params, deps }) =>
    loadRaid(context.queryClient, params.reportCode, deps.vods),
  pendingComponent: LoadingRaid,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: RouteFailure,
  component: BossRoute,
});

function BossRoute() {
  const search = bossRoute.useSearch();
  const { reportCode, encounterId } = bossRoute.useParams();

  const { data: report } = useSuspenseQuery(reportQueryOptions(reportCode));

  return <BossProgressPage report={report} search={search} encounterId={encounterId} />;
}

const addVodRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/raid/$reportCode/add-vod",
  validateSearch: addVodSearchSchema,
  params: reportParams,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(reportQueryOptions(params.reportCode)),
  pendingComponent: LoadingRaid,
  pendingMs: 0,
  pendingMinMs: 0,
  errorComponent: RouteFailure,
  component: AddVodRoute,
});

function AddVodRoute() {
  const search = addVodRoute.useSearch();
  const { reportCode } = addVodRoute.useParams();
  const navigate = addVodRoute.useNavigate();
  const { data: report } = useSuspenseQuery(reportQueryOptions(reportCode));

  const onSave = useCallback(
    (vod: SearchVod) => {
      void navigate({
        to: "/raid/$reportCode",
        params: { reportCode },
        search: searchWithVod(search, vod),
      });
    },
    [navigate, reportCode, search],
  );

  return <AddVodPage report={report} search={search} onSave={onSave} />;
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
  addVodRoute,
  designRoute,
]);

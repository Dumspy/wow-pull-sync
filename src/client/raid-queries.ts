import { queryOptions } from "@tanstack/react-query";
import { hc } from "hono/client";

import type { AppType } from "../api";
import { reportResponseSchema, vodResponseSchema } from "../contract";
import type { ReportResponse, VodResponse } from "../types";
import { vodLink, type VodRef } from "../urls";

const client = hc<AppType>("/api");

/** The report, roster and boss pulls. Shared by every VOD of the raid. */
export function reportQueryOptions(reportCode: string) {
  return queryOptions({
    queryKey: ["report", reportCode] as const,
    retry: false,
    staleTime: 60_000,
    queryFn: () => loadReport(reportCode),
  });
}

/** One VOD's start time and length. The offset is applied on the page, so it is not part of the key. */
export function vodQueryOptions(vod: VodRef) {
  return queryOptions({
    queryKey: ["vod", vod.platform, vod.id] as const,
    retry: false,
    staleTime: 60_000,
    queryFn: () => loadVod(vod),
  });
}

async function loadReport(reportCode: string): Promise<ReportResponse> {
  const reportUrl = `https://www.warcraftlogs.com/reports/${reportCode}`;

  let response: Awaited<ReturnType<typeof client.report.$post>>;

  try {
    response = await client.report.$post({ json: { reportUrl } });
  } catch {
    throw new Error("Could not reach the app.");
  }

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Something went wrong loading that raid.");
  }

  return reportResponseSchema.parse(await response.json());
}

async function loadVod(vod: VodRef): Promise<VodResponse> {
  const vodUrl = vodLink(vod);

  let response: Awaited<ReturnType<typeof client.vod.$post>>;

  try {
    response = await client.vod.$post({ json: { vodUrl } });
  } catch {
    throw new Error("Could not reach the app.");
  }

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Something went wrong loading that VOD.");
  }

  return vodResponseSchema.parse(await response.json());
}

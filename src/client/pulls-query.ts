import { queryOptions } from "@tanstack/react-query";
import { hc } from "hono/client";

import type { AppType } from "../api";
import { pullSyncResponseSchema, type PullSyncResponse } from "../contract";

const client = hc<AppType>("/api");

/** The page still shifts the player locally. The request offset stays in the cache key. */
export const REQUEST_OFFSET_SECONDS = 0;

export function pullsQueryOptions(reportCode: string, videoId: string, offsetSeconds: number) {
  return queryOptions({
    queryKey: ["pulls", reportCode, videoId, offsetSeconds] as const,
    retry: false,
    staleTime: 60_000,
    queryFn: () => loadPulls(reportCode, videoId, offsetSeconds),
  });
}

async function loadPulls(
  reportCode: string,
  videoId: string,
  offsetSeconds: number,
): Promise<PullSyncResponse> {
  const reportUrl = `https://www.warcraftlogs.com/reports/${reportCode}`;
  const vodUrl = `https://www.youtube.com/watch?v=${videoId}`;

  let response: Awaited<ReturnType<typeof client.pulls.$post>>;

  try {
    response = await client.pulls.$post({
      json: { reportUrl, vodUrl, offsetSeconds },
    });
  } catch {
    throw new Error("Could not reach the app.");
  }

  if (!response.ok) {
    const error = await response.json();

    throw new Error(error.error || "Something went wrong loading that raid.");
  }

  return pullSyncResponseSchema.parse(await response.json());
}

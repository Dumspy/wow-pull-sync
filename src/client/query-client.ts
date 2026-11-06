import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { jsonBody, type Json } from "../json";
import { captureQueryError } from "./analytics";

/** The stable name is `queryKey[0]`. Report codes and video ids stay off the exception. */
export function reportedQueryName(queryKey: Json): string | null {
  const list = z.array(jsonBody).safeParse(queryKey);

  if (!list.success) return null;

  const name = z.string().safeParse(list.data[0]);

  if (!name.success) return null;

  return name.data;
}

export function queryErrorProperties(queryName: string) {
  return { query: queryName };
}

function reportCacheError(error: Error, queryKey: Json): void {
  const name = reportedQueryName(queryKey);

  if (!name) return;
  captureQueryError(error, queryErrorProperties(name));
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      reportCacheError(error, jsonBody.parse(JSON.parse(JSON.stringify(query.queryKey))));
    },
  }),
  mutationCache: new MutationCache({
    onError(error, variables, onMutateResult, mutation) {
      void variables;
      void onMutateResult;
      const key = mutation.options.mutationKey;

      if (!key) return;
      reportCacheError(error, jsonBody.parse(JSON.parse(JSON.stringify(key))));
    },
  }),
});

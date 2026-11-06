import { captureException } from "@sentry/react";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { z } from "zod";

const keyName = z.string().or(z.number()).or(z.boolean()).or(z.null());

/** The tag is `queryKey[0]` or `mutationKey[0]`. Report codes and video ids stay off the event. */
export function queryErrorTag(name: string | number | boolean | null): string {
  return String(name);
}

function captureQueryError(error: Error, first: z.infer<typeof keyName> | undefined): void {
  captureException(error, {
    tags: { query: first === undefined ? "" : queryErrorTag(first) },
  });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError(error, query) {
      const parsed = keyName.safeParse(query.queryKey[0]);

      captureQueryError(error, parsed.success ? parsed.data : undefined);
    },
  }),
  mutationCache: new MutationCache({
    onError(error, variables, onMutateResult, mutation) {
      void variables;
      void onMutateResult;
      const parsed = keyName.safeParse(mutation.options.mutationKey?.[0]);

      captureQueryError(error, parsed.success ? parsed.data : undefined);
    },
  }),
});

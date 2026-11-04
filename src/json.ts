import { z } from "zod";

/** Any JSON value. Parsed with Zod instead of a hand-written predicate. */
export const jsonBody = z.json();

export type Json = z.infer<typeof jsonBody>;

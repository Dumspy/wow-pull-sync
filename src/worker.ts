import { sentry } from "@sentry/hono/cloudflare";
import { Hono } from "hono";

import { api, type Env } from "./api";
import { workerSentryOptions } from "./worker-sentry";

const API_PATHS = new Set(["/api/report", "/api/vod"]);

const app = new Hono<{ Bindings: Env }>();

app.use(sentry(app, workerSentryOptions));

app.route("/api", api);

app.all("*", (c) => {
  // A non-POST API call is a 404. Don't replace that response with the page.
  if (API_PATHS.has(c.req.path)) return c.notFound();

  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;

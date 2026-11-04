import { Hono } from "hono";

import { api, type Env } from "./api";

const app = new Hono<{ Bindings: Env }>();

app.route("/api", api);

app.all("*", (c) => {
  // A non-POST /api/pulls is a 404. Don't replace that response with the page.
  if (c.req.path === "/api/pulls") return c.notFound();

  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;

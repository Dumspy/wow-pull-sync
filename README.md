# Pull sync

Paste a Warcraft Logs report and the YouTube VOD from that night. The page embeds the VOD and lists every boss pull. Click a pull and the player seeks to when it started.

A pull's place in the video is wall-clock time. Warcraft Logs gives the report start and each fight's offset from that start. YouTube's `liveStreamingDetails.actualStartTime` is second 0 of a finished live stream. The seek time is those two instants compared, plus an optional offset in seconds (stream delay, or a VOD that was trimmed). Trash fights are left out. A pull that falls outside the VOD is marked "not in VOD".

```
vodSeconds = (reportStart + fight.startTime - actualStartTime) / 1000 + offset
```

Boss pulls are fights with `encounterID > 0`.

## Local development

You need Node.js 22.12 or newer and npm. Wrangler 4 requires Node 22 or newer, and Vite 7 requires 22.12 or newer on that line.

```sh
npm install
cp .dev.vars.example .dev.vars
```

Fill in `.dev.vars`:

- `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` — a Warcraft Logs OAuth client. Create one on the [API clients page](https://www.warcraftlogs.com/api/clients/). The app uses the client-credentials flow, so it can read public reports only.
- `YOUTUBE_API_KEY` — a YouTube Data API v3 key. Enable the API and create a key in the [Google Cloud console](https://console.cloud.google.com/apis/credentials), as described in the [YouTube Data API overview](https://developers.google.com/youtube/v3/getting-started).
- `USE_FIXTURES` — set to `true` to serve the recorded responses in `fixtures/` instead of calling those APIs. Leave it empty for real requests.

Do not set `USE_FIXTURES` in production.

Scripts, as defined in `package.json`:

| Script | Command |
| --- | --- |
| `npm run dev` | `vite` |
| `npm run build` | `vite build` |
| `npm run preview` | `vite preview` |
| `npm test` | `vitest run` |
| `npm run deploy` | `npm run build && wrangler deploy` |

`npm run dev` runs the Worker and the page together on the Workers runtime. `npm test` is the timestamp unit tests.

With `USE_FIXTURES=true`, these two links load the recorded night. Every boss pull in that pair sits inside the VOD. The first is Ula'tek pull 1 at 24:32.

- https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9
- https://youtube.com/live/BLJBhzLNt8w

Add `?fixture=outside` to the VOD URL to serve the same video with `actualStartTime` shifted 30 minutes later, so the early pulls fall before the stream. A normal upload such as `https://www.youtube.com/watch?v=dQw4w9WgXcQ` returns the recorded response that has no `liveStreamingDetails`. While `npm run dev` is running, `?player=fake` on the page uses a stand-in player instead of the YouTube iframe.

## Deploy

Deploy from this directory with `npm run deploy`, or with `npx wrangler deploy` after `npm run build`.

Cloudflare's Git integration (Workers Builds) can deploy on push instead. Set the build command to `npm run build` and the deploy command to `npx wrangler deploy`. The Worker name in Cloudflare has to match `name` in `wrangler.jsonc`. Turn off builds for branches other than the production branch. Those builds publish preview URLs, and the preview URLs are public.

Set the three runtime secrets once. Later deploys keep them.

```sh
npx wrangler secret put WCL_CLIENT_ID
npx wrangler secret put WCL_CLIENT_SECRET
npx wrangler secret put YOUTUBE_API_KEY
```

`workers_dev` and `preview_urls` are off, so the Worker has no `workers.dev` URL and no version preview URL. Attach a custom domain or a route outside `wrangler.jsonc`. Cloudflare Access can sit in front of that hostname. Set `workers_dev` back to `true` and deploy if you want the `workers.dev` URL for a quick test.

Pull requests run `npm ci`, `npm test`, and `npm run build`.

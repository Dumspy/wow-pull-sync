# Pull sync

After a raid, paste a Warcraft Logs report and the YouTube VOD from that night. The page embeds the VOD and lists every boss pull. Click a pull and the player seeks to when that pull started.

Trash fights are left out. A pull that falls outside the VOD is marked "not in VOD". An optional offset, in seconds, shifts every timestamp (stream delay or a trimmed VOD).

## Run locally

```sh
npm install
cp .dev.vars.example .dev.vars
```

Fill in `.dev.vars`:

- `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` — a Warcraft Logs OAuth client (client credentials). Public reports only.
- `YOUTUBE_API_KEY` — a YouTube Data API v3 key.
- `USE_FIXTURES` — set to `true` to skip both APIs and serve the recorded responses in `fixtures/`. Leave it empty once the keys are filled in.

```sh
npm run dev
```

That starts the Worker and the page together (Vite, running on the Workers runtime). `npm test` runs the timestamp unit tests. `npx wrangler dev` serves the same Worker. Run it from this directory after `npm run dev` or `npm run build`, which writes the generated Wrangler config the dev command follows.

With `USE_FIXTURES=true`, these two links from the same night load the recorded responses:

- https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9
- https://youtube.com/live/BLJBhzLNt8w

The public video title is "Average Pillagers - 29/10/26". The fixture fight list uses that guild's raid bosses. The pull times are not the real report: the report page and the YouTube watch page both blocked unauthenticated fetches, so the times are arranged so the first boss pull is at 38:00 and the last pull falls past the end of the VOD. Clear `USE_FIXTURES` and fill in the keys to load the real report.

## Deploy later

Do not set `USE_FIXTURES` in production.

```sh
npx wrangler secret put WCL_CLIENT_ID
npx wrangler secret put WCL_CLIENT_SECRET
npx wrangler secret put YOUTUBE_API_KEY
npm run deploy
```

`npm run deploy` is `vite build` and then `wrangler deploy`. Secrets stay on the Worker. The browser only talks to `/api/pulls`.

## How a pull lines up with the VOD

Warcraft Logs gives the report `startTime` as epoch milliseconds, and each fight `startTime` as milliseconds from the start of the report. YouTube `liveStreamingDetails.actualStartTime` is when the finished stream actually started, which is second 0 of the VOD. `contentDetails.duration` is the VOD length.

```
vodSeconds = (reportStart + fight.startTime - actualStartTime) / 1000 + offset
```

Boss pulls are fights with `encounterID > 0`.

# pull-sync product spec

This folder describes what pull-sync should become and the order we plan to build it in. It is a product spec, not a technical design. Technical choices that are not decided yet are marked "to confirm with engineering".

## What it is

pull-sync lines up a Warcraft Logs (WCL) combat report with the stream VODs a raid already has on YouTube or Twitch. Every pull in the log links to its moment in the video, so you can jump straight to a wipe or a kill instead of scrubbing through a four-hour stream.

It is similar in spirit to Warcraft Recorder, but it is built on logs and streams people already make. Nobody has to install a recorder.

## Who it is for

A raid guild reviewing its raid nights: the raid leader looking for what went wrong on a pull, officers checking progress, and raiders rewatching their own deaths.

## What ships today

You paste a WCL report link and a YouTube VOD link and get a review page at a reloadable URL (`/raid/<report>`). The video is the main focus. A side panel lists the boss pulls grouped by boss (kill or wipe, duration). A bottom timeline switches between the whole night and the selected pull. For a selected pull it shows boss HP, phases and event lanes for any boss spell you pick from the "Add events" list. Clicking a pull seeks the video to that pull. The VOD offset is kept in the URL. A raid overview page shows every boss with kills, wipes and time spent, and a boss progress page charts boss HP across a boss's pulls; both link back into the review page.

The UI follows the new design system (paste page, raid page, loading and error states), and there is a `/design` gallery of the components.

A raid can be followed while it happens. A report whose end time is under 30 minutes old counts as live, shows a Live badge and is fetched again every 30 seconds, so new pulls appear on their own. A YouTube stream that is still running can be added as a VOD; Twitch VODs wait until the stream has ended. A log that isn't live has a Refresh button instead.

Cookieless PostHog analytics and the anti-slop lint rules (phase 0) are in place.

The site runs on Cloudflare Workers and is behind Cloudflare Access for now.

## Principles

- **Free first.** The core flow (load a raid, line it up with VODs, review it) stays free. Anything paid sells our own storage, slots or ad-free use, never Blizzard or WCL data.
- **Small and nice to use.** Fewer features done well beat many rough ones. The video stays the main focus.
- **Wall-clock sync.** Pulls are placed on real time: the WCL report start plus each fight's offset, compared with the stream's actual start time. Each video is its own source on that shared clock, with its own offset nudge to fix small drift.

## Phases

| Phase                                              | Status          | Summary                                                                      |
| -------------------------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| [0 Foundations](00-foundations.md)                 | Done            | Lint rules and cookieless PostHog analytics.                                 |
| [1 Review UI](01-review-ui.md)                     | Done            | Replay inspector with pickable event lanes, raid overview and boss progress. |
| [2 Multiple VODs](02-multi-vod.md)                 | Done            | Several YouTube and Twitch VODs per raid, each with its own offset.          |
| [3 Saved raids](03-saved-raids.md)                 | Planned         | Raids are saved and listed on a home page.                                   |
| [4 Accounts and guilds](04-accounts-and-guilds.md) | Planned         | Sign-in, Battle.net linking, guilds, members, roles and share links.         |
| [5 Guild upgrade](05-guild-upgrade.md)             | Planned (later) | Optional paid guild upgrade: more VOD slots, ad-free, longer retention.      |
| [6 Own parsing](06-own-parsing.md)                 | Far future      | Parse combat logs in the browser and upload only a summary.                  |

Each phase builds on the one before it. The design screens in [`docs/design/pull-sync-designs.html`](../design/pull-sync-designs.html) map onto phases 1 to 5. Open the file in a browser; it unpacks itself and needs JavaScript.

## Glossary

- **Report:** a Warcraft Logs combat report for one raid night, identified by its WCL link.
- **Fight / pull:** one attempt at a boss inside a report, ending in a kill or a wipe. It has a start and end offset from the report start.
- **VOD:** a recorded stream or video on YouTube or Twitch that covers part or all of the raid night.
- **Offset:** a small manual correction, in seconds, applied to one VOD so its timeline lines up exactly with the log.
- **Recorded by:** the character whose point of view a VOD shows.

## Open questions

- Is the repo meant to be public? If so, is that on purpose and what should stay out of it?
- When do we ask Archon (WCL) and Blizzard for permission, and for what? See phase 5.
- What is the product name? It should not contain "Warcraft".

# Phase 5: Guild upgrade (paid)

**Status:** Planned (later)

## Goal

Offer an optional paid upgrade at guild level that pays for running the app, while the core flow stays free for everyone.

## User stories

- As a guild member, I want to buy the upgrade for my whole guild, so everyone gets the benefits, not just me.
- As a guild, we want more VOD slots per raid and to keep our raids longer.
- As a raider, I want to use the free version without ads getting in the way of the video.

## Screens involved

None of the nine designs cover this yet. It needs an upgrade or billing screen, plus space for banner ads that Felix will design.

## In scope

- A guild-level upgrade that any member of the guild can buy. It gives:
  - more VOD slots
  - ad-free use
  - longer retention of our own data
- Payment through Stripe.
- Very unobtrusive banner ads on the free version, designed by Felix. No mandatory video ads.
- The core flow (load a raid, add VODs, review it) stays free.

## Out of scope

- Charging for anything that uses Blizzard API data or WCL data.
- Per-user plans.
- Video ads.

## Constraints

- Blizzard API terms, section 2(b), ban paid features that use the API.
- WCL needs commercial approval for commercial use (contact: advertising@archon.gg).
- Archon owns WCL and bought Warcraft Recorder in March 2026, so a paid product would compete with our API provider.
- A free tool, "WCL VOD Review", already does the core sync.
- Safe pattern: charge only for our own storage, slots, seats, ad-free use or cosmetics.
- Keep Blizzard data under 30 days.
- Keep "Warcraft" out of the product name.
- Get permission before charging anything.

## Acceptance criteria

- A guild member can buy the upgrade and every member of that guild sees the benefits.
- An upgraded guild sees no ads.
- An upgraded guild can add more VODs per raid than a free guild.
- An upgraded guild's raids are kept longer than a free guild's.
- A free guild can still do the full core flow.
- Banner ads never cover the video or the timeline.
- Nothing paid depends on Blizzard or WCL data.

## Data and dependencies

- Stripe.
- D1. Stored things: guild upgrade status and billing period.
- Written permission from Archon (WCL) and, if needed, Blizzard before launch.

## Open questions

- Price, billing period, and what happens when an upgrade lapses (for example raids past the free retention).
- Exact free and paid limits for VOD slots and retention.
- Which ad network, if any, and how it fits with cookieless analytics and consent.
- When to contact Archon and Blizzard, and what to ask for.
- Product name.

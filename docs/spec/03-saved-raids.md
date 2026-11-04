# Phase 3: Saved raids

**Status:** Planned

## Goal

Save raids so a review can be reopened later without pasting links again, and give the app a home page that lists them.

## User stories

- As a raid leader, I want to come back to last week's raid and find it already set up with its VODs and offsets.
- As a raider, I want a list of recent raids to pick from, instead of hunting for the WCL link.
- As someone who set up the offsets, I want them kept, so nobody has to redo the alignment.

## Screens involved

- "Review a raid" home, with the raid list

## In scope

- Persisting raids in Cloudflare D1.
- What a saved raid holds: the WCL report reference, its VODs, each VOD's recorded-by character and offset, and basic raid info for the list (such as date, zone and bosses).
- A home page with a "Review a raid" entry point (paste a WCL link) and a list of saved raids.
- Opening a saved raid goes straight to the replay inspector with its VODs.
- Progress across several saved raids for the same boss, if it fits this phase (see open questions).

## Out of scope

- Ownership of raids, private raids and guild lists. Without accounts, saved raids are not tied to anyone (phase 4).
- Retention rules for paid guilds (phase 5).
- Storing copies of WCL data beyond what is needed to show the list. WCL terms ban copying their data.

## Acceptance criteria

- After loading a raid and adding VODs, reloading the page or coming back the next day shows the same raid with the same VODs and offsets.
- The home page lists saved raids with enough info to tell them apart.
- Clicking a raid in the list opens it in the replay inspector.
- Pasting a WCL link on the home page creates or opens that raid.

## Data and dependencies

- Cloudflare D1. Stored things: raids, VODs (with recorded-by character and offset).
- How long cached WCL responses are kept, and where: to confirm with engineering.
- Workers Paid (about $5 a month) may be needed once usage grows.

## Open questions

- Before accounts exist, who can see and edit saved raids? Everyone behind Cloudflare Access, or should saving wait for phase 4?
- What raid info is fine to store for the list given WCL's terms, and what must be fetched live?
- Should multi-night boss progress be part of this phase or wait for guilds in phase 4?
- How long do we keep saved raids by default on the free version?

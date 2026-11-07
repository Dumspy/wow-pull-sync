# Phase 1: Review UI

**Status:** Done

**What shipped:** the restyled review page, boss-grouped pull list, pull timeline with boss HP, phases and a deaths lane, and an "Add events" picker that lists every spell the boss and its adds cast (with icons, same-named spells merged, a small default hide list) and shows the chosen ones as lanes. Picks live in the URL, so they are shareable. Clicking a death or event seeks to it. The offset is kept in the URL. The raid overview (`/raid/<report>/overview`) and boss progress (`/raid/<report>/boss/<encounter>`) pages are in, and the `overview opened` and `boss progress opened` analytics events.

**Left for later:** the picker only covers enemy casts. Player cooldowns, buffs and debuffs, interrupts and dispels are not offered yet. Real WCL data (spell names and icons) has only been checked against recorded fixtures so far.

## Goal

Turn the current rough review page into the real review experience from the designs: a replay inspector with event lanes, a raid overview and a boss progress view, all driven by data from the Warcraft Logs API.

## User stories

- As a raid leader, I want to see boss HP, deaths and phases on the timeline under the video, so I can jump to the moment a pull fell apart.
- As a raider, I want to click my death and see it in the video, so I can learn what killed me.
- As an officer, I want an overview of the whole night (pulls, kills, wipes, time spent per boss), so I can judge how the raid went without watching all of it.
- As a raid leader, I want to see how close we got on a boss across pulls, so I can tell whether we are improving.

## Screens involved

- Replay inspector (single VOD for now; multiple VODs arrive in phase 2)
- Raid overview
- Boss progress

## In scope

- Replay inspector: the video stays the main focus, with the pull list and a timeline. The timeline gains event lanes, such as boss HP, deaths, phases and other key events. Clicking an event seeks the video.
- Raid overview: a summary of one raid night: bosses, pulls, kills and wipes, and durations.
- Boss progress: for one boss in the report, every pull side by side with how far each got (for example boss HP or phase reached at the end).
- All combat data comes from the WCL v2 GraphQL API.
- The existing wall-clock sync stays as it is.

## Out of scope

- More than one VOD per raid (phase 2).
- Twitch VODs (phase 2).
- Saving raids or a raid list (phase 3).
- Progress across several raid nights. That needs saved raids (phase 3).
- Accounts, guilds and sharing (phase 4).

## Acceptance criteria

- Loading a WCL report and a YouTube VOD opens the replay inspector, with the video as the main element.
- The timeline shows boss HP, deaths and phases for the selected pull, and these line up with what is visible in the video.
- Clicking a death or other event jumps the video to that moment.
- The raid overview shows every boss pulled that night with pull count, kills, wipes and time spent.
- Boss progress shows each pull for a chosen boss and how far it got.
- The page stays usable on a laptop screen without horizontal scrolling.
- The new interactions send analytics events with no report codes, fight ids or video ids.

## Data and dependencies

- WCL v2 GraphQL API for fights, boss HP, deaths, phases and events.
- Lanes are enemy casts picked by the user. Which other event types to offer, and how to load them cheaply (player casts are far more numerous): to confirm with engineering.
- How API responses are cached (KV or Cache API): to confirm with engineering.

## Open questions

- Which event sources should the picker add next: player cooldowns, buffs and debuffs, interrupts, dispels? (Boss and add casts are covered.)
- Does the WCL API give phase information for every boss, or will some bosses lack phases?
- Which new analytics events should this phase add?

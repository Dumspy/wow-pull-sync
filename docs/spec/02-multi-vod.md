# Phase 2: Multiple VODs

**Status:** Planned

## Goal

Let a raid have several VODs from YouTube and Twitch, each showing a different player's view, so the review can switch between points of view on the same pull.

## User stories

- As a raid leader, I want to add the tank's and the healer's streams to the same raid, so I can see a pull from more than one angle.
- As a raider, I want to say which character recorded a VOD, so others know whose view they are watching.
- As someone adding a VOD, I want to nudge its offset by a few seconds, so it lines up exactly with the log.
- As a viewer, I want an expired Twitch VOD to say so clearly, so I am not left staring at a broken player.

## Screens involved

- Add VOD (with offset nudge)
- Replay inspector (switching between VODs)

## In scope

- YouTube and Twitch VODs.
- Several VODs per raid. Each VOD has:
  - a "recorded by" character
  - its own offset nudge
- Add VOD flow: paste a link, choose the recorded-by character, check the alignment and nudge the offset.
- Pulls stay on wall-clock time. Each video is its own source on that shared clock, so switching VODs keeps you at the same moment of the pull.
- The video player sits behind a small interface so YouTube and Twitch behave the same in the inspector.
- Expired Twitch VODs show a simple "VOD expired" overlay. The log data, timeline and other VODs keep working.

## Out of scope

- Hosting or uploading video files ourselves.
- Platforms other than YouTube and Twitch.
- A limit on VOD slots. Limits are a phase 5 question.
- Saving the VOD setup between visits (phase 3).

## Acceptance criteria

- I can add a YouTube VOD and a Twitch VOD to the same raid and switch between them in the inspector.
- Switching VODs during a pull keeps the playback at the same moment of that pull (within the offset).
- Each VOD shows its recorded-by character.
- Nudging a VOD's offset moves only that VOD and the change is visible straight away.
- An expired or deleted Twitch VOD shows the "VOD expired" overlay, and the pull list and timeline still work.

## Data and dependencies

- Each VOD needs a real start time on the wall clock. For YouTube this is the live stream's actual start time, as today. How we get the start time for Twitch VODs: to confirm with engineering.
- Where the recorded-by character list comes from (the report's player list is the obvious source): to confirm with engineering.

## Open questions

- What happens with a VOD that is not a past live stream (for example an uploaded video with no start time)? Manual start time, or not supported?
- Should viewers be able to watch two VODs side by side, or only switch between them?
- How many VODs per raid should the free version allow, if any limit at all? (Ties into phase 5.)

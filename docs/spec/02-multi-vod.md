# Phase 2: Multiple VODs

**Status:** Done

**What shipped:** YouTube and Twitch (past broadcast) VODs, several per raid, kept in the page URL. Each VOD has a recorded-by player and its own offset. The VOD bar switches between them at the same moment of the pull (2a), and Side by side shows up to three, kept in sync, with one pane playing sound (2b). The Add VOD page checks the link, guesses the offset from the first pull and lets you check it against later pulls. Expired Twitch VODs show the "VOD expired" pane with Replace link.

## Goal

Let a raid have several VODs from YouTube and Twitch, each showing a different player's view, so the review can switch between points of view on the same pull.

## User stories

- As a raid leader, I want to add the tank's and the healer's streams to the same raid, so I can see a pull from more than one angle.
- As a raider, I want to say which character recorded a VOD, so others know whose view they are watching.
- As someone adding a VOD, I want to nudge its offset by a few seconds, so it lines up exactly with the log.
- As a viewer, I want an expired Twitch VOD to say so clearly, so I am not left staring at a broken player.

## Milestones

- **2a: Switching.** Several VODs per raid, one shown at a time, switched from the inspector.
- **2b: Side by side.** Watch up to three points of view at once, all kept on the same moment of the pull.

## Screens involved

Both screens are in the design file [`docs/design/pull-sync-designs.html`](../design/pull-sync-designs.html) ("Add VOD" and "Replay inspector").

- **Add VOD**, its own page under the raid (Raids / raid / Add VOD). The video preview is on the left and three steps are on the right:
  1. Recording: paste the link and pick the recorded-by character from the report's players. A valid link shows its platform and length ("YouTube 2:41:07 · a finished recording", or "so far · still live" for a stream that is still running).
  2. Offset: a guessed offset (for example "+6.0s, guessed from the pull #3 start") with −1s, −0.1s, +0.1s and +1s nudges. Under the preview: "Log says: Pull #3 starts 0:00 → Video should show: pull timer at 31:35".
  3. Check other pulls: jump to later pulls to confirm the offset holds across the night.
     Then Save VOD or Cancel. A bad link turns the input red, dims steps 2 and 3, disables Save, and shows one of:
  - Not started: "This stream hasn't started yet. Add it once the stream is live."
  - Twitch still live: "This Twitch stream is still live. Twitch VODs can be added once the stream has ended. Live raids work with YouTube streams."
  - Not found: "We couldn't find this video. Check the link, and that the video is public or unlisted."
  - Not a stream: "This isn't a recorded live stream. pull-sync needs a stream recording to line up with the log. Uploads and highlights have no start time."
  - Wrong link: "This link is not supported. pull-sync works with YouTube and Twitch recordings."
- **Replay inspector.** A VOD bar above the player has one chip per VOD (portrait, name, platform, offset, and a dot showing whether it covers the selected pull), then Add VOD and a Side by side toggle. The offset of the active VOD can also be edited under the player.
  - 2a: clicking a chip switches the player to that VOD.
  - 2b: with Side by side on, chips add or remove panes, up to three ("Pick up to 3 · speaker sets the audio"). Adding a fourth drops the oldest. Each pane has an Audio / Muted button; only one pane plays sound, and it gets the outline.
  - A VOD that does not cover the selected pull shows "No footage for this pull · Pick another pull or VOD".
  - An expired VOD's chip is dimmed with an "Expired" tag. Its pane says "VOD expired · {platform} removed this recording. The log and timeline still work." with a Replace link button that opens Add VOD.

## In scope

- YouTube and Twitch VODs.
- Several VODs per raid. Each VOD has:
  - a "recorded by" character, required when adding the VOD
  - its own offset nudge
- Add VOD flow: paste a link, choose the recorded-by character, check the alignment and nudge the offset.
- The first page takes only the Warcraft Logs link. It opens Add VOD as "Add your first VOD", with the log already loaded, so the first VOD gets a recorder like every other. Skipping it shows the raid with no VOD: the pulls and timeline work, and the video area asks for a VOD.
- Pulls stay on wall-clock time. Each video is its own source on that shared clock, so switching VODs keeps you at the same moment of the pull.
- The video player sits behind a small interface so YouTube and Twitch behave the same in the inspector.
- Until phase 3, the raid's VODs (platform, video, offset, recorded-by) live in the page URL, even if that makes the link long.
- Expired Twitch VODs show a simple "VOD expired" overlay with a Replace link button. The log data, timeline and other VODs keep working.

## Out of scope

- Hosting or uploading video files ourselves.
- Platforms other than YouTube and Twitch.
- A limit on VOD slots. Limits are a phase 5 question.
- Saving the VOD setup between visits (phase 3).
- Videos with no real start time, such as normal uploads. They are not supported at the start of phase 2; we may add a manual start time later.

## Acceptance criteria

- I can add a YouTube VOD and a Twitch VOD to the same raid and switch between them in the inspector (2a).
- I can watch up to three VODs side by side, they stay on the same moment of the pull, and only the one I pick plays audio (2b).
- Switching VODs during a pull keeps the playback at the same moment of that pull (within the offset).
- Each VOD shows its recorded-by character.
- Nudging a VOD's offset moves only that VOD and the change is visible straight away.
- An expired or deleted Twitch VOD shows the "VOD expired" overlay, and the pull list and timeline still work. Replace link lets me swap in a new link.
- Pasting a stream that hasn't started, an upload or highlight, a missing video or an unsupported link shows the matching error and Save stays disabled.

## Data and dependencies

- Each VOD needs a real start time on the wall clock. For YouTube this is the live stream's actual start time, as today.
- A YouTube stream that is still running can be added. A Twitch stream that is still live can't: Twitch doesn't reliably let every viewer play or seek a broadcast in progress. Its length so far is the time since it started, and it grows on the page until the stream ends.
- For Twitch, only past broadcasts (archive VODs) are supported. Their start time is the Twitch API's video creation time (`created_at`). Checked against the 29 Oct 2026 fixture night, it lands within about 4 to 5 seconds of the real pull, the same as YouTube, and the offset nudge covers the rest. Highlights and uploads have no usable start time and are not supported, like YouTube uploads.
- A Twitch stream that drops and reconnects is split into several VODs. Each one is added as its own VOD.
- Twitch removes VODs after a while (about 14 days for affiliates, 60 for partners). When the API no longer returns a VOD, the inspector shows the "VOD expired" overlay.
- The Twitch embed player can seek and report its current time for VODs, so it fits behind the same player interface as YouTube.
- The recorded-by character list comes from the report's player list.

## Decisions

- Videos with no real start time (for example normal uploads) are not supported at first. A manual start time can be looked at later.
- Switching ships first (milestone 2a). Side-by-side multi-POV follows (milestone 2b).
- Recorded-by is required, so the viewer always knows whose point of view they are watching.
- VOD setup is kept in the URL until saved raids exist (phase 3). A long URL is fine for now.
- Any limit on VODs per raid for the free version is left to phase 5.
- Pane captions (who recorded it, the pull, the Audio / Muted button) sit in a strip above the video, not over it as in the design. Twitch's embed won't start without a click while anything covers it.
- The log comes first and VODs are added after, so the recorded-by list is always there when a VOD is added. The first VOD is not a special case with a placeholder name.

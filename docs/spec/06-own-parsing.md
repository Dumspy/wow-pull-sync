# Phase 6: Own parsing

**Status:** Far future

## Goal

Read combat logs ourselves instead of relying only on Warcraft Logs, by parsing the log file in the user's browser and uploading only a summary.

## User stories

- As a raid leader, I want to review a raid from my own combat log, even if it was never uploaded to WCL.
- As a guild, we want our review data to be ours, not something we have to fetch from another service every time.

## Screens involved

None designed yet. It would need a way to pick a combat log file, probably from the "Review a raid" home or the Add VOD flow.

## In scope

- Parsing the combat log file in the browser.
- Uploading only a summary (pulls, timings, and the events needed for the timeline), not the full log.
- Hand-coded phase definitions per boss.

## Out of scope

- Copying or exporting data from WCL. WCL has no export and its terms ban copying.
- A full log analysis tool like WCL itself (damage meters, rankings).
- Server-side parsing of full log files.

## Acceptance criteria

To be written when this phase gets closer. As a starting point:

- I can choose a combat log file and see its pulls in the replay inspector without uploading it to WCL.
- Only a small summary leaves my machine.
- Pulls line up with VODs on wall-clock time, the same way WCL reports do.

## Data and dependencies

- No good permissively licensed combat log parser exists, so we would likely build our own.
- Phases are not in the log and would be hand-coded per boss.
- Which stored things the summary needs: to confirm with engineering.

## Open questions

- Is the effort worth it compared with staying on WCL?
- Does the combat log carry enough timing data to line up with VODs on wall-clock time?
- Who maintains boss phase definitions each new raid tier?
- Does our own parsing change the phase 5 constraints (for example, could paid features use our own data)?

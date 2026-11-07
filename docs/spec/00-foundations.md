# Phase 0: Foundations

**Status:** In review (PR 7 lint, PR 8 analytics)

## Goal

Set up the groundwork the rest of the product relies on: lint rules that keep the code readable, and privacy-friendly analytics so we can see whether people actually use the review page.

## User stories

- As Felix, I want lint rules that catch sloppy code early, so the codebase stays easy to work in as it grows.
- As Felix, I want to know how many raids get loaded and which pulls people click, so I can tell what is worth building next.
- As a visitor, I don't want to be tracked with cookies or asked to accept a consent banner just to review a raid.

## Screens involved

None directly. Both pieces sit underneath the existing review page.

## In scope

- Anti-slop lint setup based on Oxlint (PR 7), running in CI on pull requests.
- PostHog analytics on the EU cloud (PR 8):
  - Cookieless, with memory-only persistence. Nothing is written to cookies, localStorage or sessionStorage.
  - The project key is supplied through the `VITE_POSTHOG_KEY` build variable. With no key, or in local development, nothing is sent.
  - Events:
    - `$pageview`
    - `raid loaded`, with `pull_count`
    - `pull clicked`, with `encounter_id` and `kill`
    - `VOD played`, with no properties
  - No report codes, fight ids or video ids are sent.

## Out of scope

- A consent banner. It comes back as a question once accounts exist (phase 4).
- Identifying users in analytics. There are no accounts yet.
- Dashboards or funnels in PostHog beyond seeing that events arrive.

## Acceptance criteria

- PR 7 is merged and its lint check runs on new pull requests.
- PR 8 passes the lint from PR 7 (with a fix-up commit if needed).
- After the key is set and the site redeployed, loading a raid on ps.rger.dev shows `$pageview` and `raid loaded` in PostHog EU within about a minute. Clicking a pull and playing the video show `pull clicked` and `VOD played`.
- In the browser dev tools, no PostHog cookies or local/session storage entries appear.
- No event in PostHog contains a report code, fight id or video id.
- Setup steps are written in the PR description, not the README.

## Data and dependencies

- PostHog EU cloud project, created by Felix. The region is chosen at signup and cannot be changed later.
- Cloudflare Workers Builds build variable `VITE_POSTHOG_KEY`.

## Open questions

- Which extra events, if any, should later phases add? Each phase should name its own.
- At what point does analytics need a consent banner (for example once we identify signed-in users)?

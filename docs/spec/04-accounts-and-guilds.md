# Phase 4: Accounts and guilds

**Status:** Planned

## Goal

Let people sign in, link their Battle.net characters and organise raids under guilds with members and roles. Raids can be shared publicly with a link.

## User stories

- As a raider, I want to sign in with Discord, email or Google, so I don't need yet another password.
- As a raider, I want to link my Battle.net account once, so the app knows my characters and which guild I am in.
- As a guild master, I want to be the guild leader in the app automatically, so I don't need to prove it to anyone.
- As a guild leader, I want to manage members and their access, so only the right people can add or edit raids.
- As a raid leader, I want to share a raid with someone outside the guild through a link, without making them sign up.

## Screens involved

- Sign-in
- Guilds
- Members and access
- Public share view

## In scope

- App login through Clerk with Discord, email and Google.
- Our own single global "Link Battle.net" OAuth flow, separate from login. It stores the Battle.net account ID and character IDs in D1. The China region is not supported.
- The Battle.net user token is only needed at link time, to read the user's WoW profile (`/profile/user/wow`). Everything else uses the app token.
- Guilds, members and roles live in our database.
- The guild leader is whoever holds Battle.net guild rank 0 (Guild Master). Rank logic is reused from Felix's earlier project auxarmory; its auth approach is not.
- Saved raids belong to a guild.
- Public share view through our own share tokens. The view is read-only.

## Out of scope

- Raider.io integration.
- China region Battle.net accounts.
- Paid features (phase 5).
- Signing in with Battle.net as the login method. Battle.net is only linked.

## Acceptance criteria

- I can sign in with Discord, email or Google, and sign out.
- I can link Battle.net from my account and see my characters listed afterwards.
- If my linked character is the guild master, I appear as the guild leader of that guild.
- A guild leader can see the member list and change members' access.
- A guild member sees their guild's raids; someone outside the guild does not.
- A share link opens a read-only view of the raid without signing in, and stops working when it is revoked.

## Data and dependencies

- Clerk for login.
- Battle.net OAuth and API (app token, plus user token at link time).
- D1. Stored things: users (linked to Clerk), Battle.net accounts, characters, guilds, members, roles, share tokens.
- How often guild membership and ranks are refreshed (for example a cron job): to confirm with engineering.

## Open questions

- Which roles exist besides leader, and what can each do (add raids, edit offsets, manage members, create share links)?
- Can the guild leader hand leadership to someone who is not rank 0?
- Should share links expire on their own?
- Once users are identified, do we need a consent banner for analytics, and should analytics stay cookieless?
- Does Cloudflare Access come off the site in this phase?

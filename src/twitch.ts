import { z } from "zod";

import { fixtureTwitchStreamsBody, fixtureTwitchVideoBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX_URL = "https://api.twitch.tv/helix";

let cachedToken: { token: string; expiresAt: number } | null = null;

/** App access token from the client-credentials flow. Helix video and stream lookups need no user. */
async function accessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  const body = jsonBody.safeParse(await response.json().catch(() => null));
  const tokenBody = body.success ? z.record(z.string(), jsonBody).safeParse(body.data) : undefined;

  const token = tokenBody?.success
    ? z.string().safeParse(tokenBody.data.access_token).data
    : undefined;

  if (!response.ok || token === undefined) {
    throw new HttpError(502, "Twitch refused the API login.");
  }

  const expiresIn = tokenBody?.success
    ? (z.number().safeParse(tokenBody.data.expires_in).data ?? 3600)
    : 3600;

  cachedToken = { token, expiresAt: now + expiresIn * 1000 };

  return token;
}

async function helix(
  path: string,
  params: Record<string, string>,
  clientId: string,
  clientSecret: string,
): Promise<Json> {
  const token = await accessToken(clientId, clientSecret);
  const url = new URL(`${HELIX_URL}/${path}`);

  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);

  const response = await fetch(url, {
    headers: { "Client-Id": clientId, Authorization: `Bearer ${token}` },
  });

  // A token Twitch revoked early; the next request logs in again.
  if (response.status === 401) cachedToken = null;

  if (!response.ok) throw new HttpError(502, "Twitch could not be reached.");

  return jsonBody.parse(await response.json());
}

/** `GET /helix/videos` for one video. A missing or expired video comes back as an empty list. */
export async function fetchTwitchVideoBody(
  videoId: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
): Promise<Json> {
  if (useFixtures) return fixtureTwitchVideoBody(videoId);

  return helix("videos", { id: videoId }, clientId, clientSecret);
}

/** `GET /helix/streams` for the channel. It lists the stream only while it is live. */
export async function fetchTwitchStreamsBody(
  userId: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
): Promise<Json> {
  if (useFixtures) return fixtureTwitchStreamsBody();

  return helix("streams", { user_id: userId }, clientId, clientSecret);
}

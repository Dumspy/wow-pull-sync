import { z } from "zod";

import { fixtureReportBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";

const TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const API_URL = "https://www.warcraftlogs.com/api/v2/client";

const REPORT_QUERY = `
  query ReportFights($code: String!) {
    reportData {
      report(code: $code) {
        code
        title
        startTime
        endTime
        fights {
          id
          name
          encounterID
          startTime
          endTime
          kill
        }
      }
    }
  }
`;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const body = jsonBody.safeParse(await response.json().catch(() => null));
  const tokenBody = body.success ? z.record(z.string(), jsonBody).safeParse(body.data) : undefined;

  const token = tokenBody?.success
    ? z.string().safeParse(tokenBody.data.access_token).data
    : undefined;

  if (!response.ok || token === undefined) {
    throw new HttpError(502, "Warcraft Logs refused the API login.");
  }

  const expiresIn = tokenBody?.success
    ? (z.number().safeParse(tokenBody.data.expires_in).data ?? 3600)
    : 3600;

  cachedToken = { token, expiresAt: now + expiresIn * 1000 };

  return token;
}

export async function fetchReportBody(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
): Promise<Json> {
  if (useFixtures) return fixtureReportBody(code);
  const token = await accessToken(clientId, clientSecret);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: REPORT_QUERY, variables: { code } }),
  });

  if (!response.ok) {
    throw new HttpError(502, "Warcraft Logs could not be reached.");
  }

  return jsonBody.parse(await response.json());
}

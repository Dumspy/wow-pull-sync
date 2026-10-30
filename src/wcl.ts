import { fixtureReportBody } from "./fixtures";
import { HttpError } from "./http-error";

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
  const body: unknown = await response.json().catch(() => null);
  const token =
    body && typeof body === "object" && "access_token" in body && typeof body.access_token === "string"
      ? body.access_token
      : null;
  if (!response.ok || !token) {
    throw new HttpError(502, "Warcraft Logs refused the API login.");
  }
  const expiresIn =
    body && typeof body === "object" && "expires_in" in body && typeof body.expires_in === "number"
      ? body.expires_in
      : 3600;
  cachedToken = { token, expiresAt: now + expiresIn * 1000 };
  return token;
}

export async function fetchReportBody(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
): Promise<unknown> {
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
  return response.json();
}

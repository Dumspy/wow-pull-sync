const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseReportCode(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "warcraftlogs.com" && !host.endsWith(".warcraftlogs.com")) return null;
  const match = url.pathname.match(/^\/reports\/([A-Za-z0-9]+)\/?$/);
  return match?.[1] ?? null;
}

export function parseVideoId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "m.youtube.com") return null;
  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v") ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  const match = url.pathname.match(/^\/(?:live|embed)\/([A-Za-z0-9_-]{11})\/?$/);
  return match?.[1] ?? null;
}

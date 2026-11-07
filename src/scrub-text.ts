const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Query params replaced whole. `vods` is the raid's VOD list as encoded JSON; `video` is the Twitch player's id. */
const NAMED_PARAMS: ReadonlyArray<readonly [string, string]> = [
  ["vod", ":video"],
  ["vods", ":vods"],
  ["video", ":video"],
  ["pull", ":pull"],
  ["fight", ":pull"],
];

/** Report codes, fight ids, and video ids inside analytics and error text. */
export function scrubTrackedUrlText(value: string): string {
  const withoutPaths = value
    .replaceAll(/\/raid\/[A-Za-z0-9]+/g, "/raid/:report")
    .replaceAll(/\/reports\/[A-Za-z0-9]+/g, "/reports/:report")
    .replaceAll(/youtu\.be\/[A-Za-z0-9_-]{11}/g, "youtu.be/:video")
    .replaceAll(/\/live\/[A-Za-z0-9_-]{11}/g, "/live/:video")
    .replaceAll(/\/embed\/[A-Za-z0-9_-]{11}/g, "/embed/:video")
    .replaceAll(/\/videos?\/\d+/g, (match) => match.replace(/\d+$/, ":video"));

  let withoutNamedParams = withoutPaths;

  for (const [name, placeholder] of NAMED_PARAMS) {
    withoutNamedParams = replaceNamedParam(withoutNamedParams, name, placeholder);
  }

  return withoutNamedParams.replace(/([?&#]v=)([^&#\s]*)/g, (match, prefix: string, raw: string) =>
    VIDEO_ID.test(raw) ? `${prefix}:video` : match,
  );
}

export function isVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/** A Warcraft Logs report code is 16 letters and digits, with at least one of each. */
export function isReportCode(value: string): boolean {
  if (!/^[A-Za-z0-9]{16}$/.test(value)) return false;

  return /[A-Za-z]/.test(value) && /\d/.test(value);
}

function replaceNamedParam(value: string, name: string, placeholder: string): string {
  const pattern = new RegExp(`([?&#]${name}=)([^&#\\s]*)`, "g");

  return value.replace(pattern, (match, prefix: string, raw: string) => {
    if (raw === placeholder) return match;

    return `${prefix}${placeholder}`;
  });
}

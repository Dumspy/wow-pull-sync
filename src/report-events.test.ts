import { describe, expect, it } from "vitest";

import { pullSyncResponseSchema } from "./contract";
import { fixtureReportBody, fixtureYoutubeBody, FIXTURE_VIDEO_ID } from "./fixtures";
import { LANES } from "./lanes";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import { buildEncounterPhases, buildPlayers } from "./report-meta";
import { loadReportEvents } from "./report-events";
import app from "./worker";

const CODE = "TPYJD2c4VkLZfBp9";

describe("recorded events", async () => {
  const report = readReport(fixtureReportBody(CODE));
  const vod = readYoutubeVideo(fixtureYoutubeBody(FIXTURE_VIDEO_ID));
  const { events, lanes } = await loadReportEvents(CODE, "", "", true, report);
  const pulls = buildPulls(report, vod, 0, events);
  const pull = (fightId: number) => pulls.find((item) => item.fightId === fightId);

  it("puts each death on its pull, counted from the pull start, in order", () => {
    const deaths = pull(12)?.deaths ?? [];

    expect(deaths).toHaveLength(19);
    expect(deaths[0]).toEqual({ atMs: 124302, playerId: 27, killerAbilityId: 1292403 });
    expect(deaths.map((death) => death.atMs)).toEqual(
      deaths
        .map((death) => death.atMs)
        .slice()
        .sort((a, b) => a - b),
    );
  });

  it("only counts roster players as deaths", () => {
    const roster = new Set(buildPlayers(report).map((player) => player.id));

    for (const item of pulls) {
      for (const death of item.deaths) expect(roster.has(death.playerId)).toBe(true);
    }
  });

  it("carries phase starts relative to the pull and the players in it", () => {
    expect(pull(12)?.phaseStarts).toEqual([{ phaseId: 1, atMs: 0 }]);
    expect(pull(12)?.playerIds).toHaveLength(20);
    expect(pull(3)?.phaseStarts).toEqual([
      { phaseId: 1, atMs: 0 },
      { phaseId: 2, atMs: 1160775 - 986690 },
    ]);
    expect(pull(3)?.lastPhase).toBe(2);
  });

  it("gives each Ula'tek pull its lane events, and none to other bosses", () => {
    const first = pull(2)?.lanes.find((lane) => lane.laneId === "ulatek-mothers-wrath");

    expect(first?.events).toEqual([
      { atMs: 21910, spellId: 1298367 },
      { atMs: 26921, spellId: 1298367 },
    ]);

    const other = pulls.find((item) => item.encounterId !== 3492);

    expect(other?.lanes).toEqual([]);
  });

  it("reports only the lanes whose encounter is in the report", () => {
    expect(lanes.map((lane) => lane.id)).toEqual(LANES.map((lane) => lane.id));
  });

  it("maps the roster to classes and specs, and names the phases", () => {
    const players = buildPlayers(report);

    expect(players).toHaveLength(22);
    expect(players[0]).toEqual({
      id: 1,
      name: "Dispý",
      wowClass: "death-knight",
      spec: "Blood",
      server: "AzjolNerub",
    });

    const phases = buildEncounterPhases(report).find((entry) => entry.encounterId === 3492);

    expect(phases?.phases.map((phase) => phase.name)).toContain("Intermission: The Shattering");
    expect(phases?.phases.find((phase) => phase.id === 3)?.isIntermission).toBe(true);
  });
});

describe("POST /api/pulls with fixtures", () => {
  it("returns the report details, roster, deaths and lanes the design needs", async () => {
    const response = await app.request(
      "http://localhost/api/pulls",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportUrl: `https://www.warcraftlogs.com/reports/${CODE}`,
          vodUrl: "https://youtube.com/live/BLJBhzLNt8w",
        }),
      },
      {
        ASSETS: { fetch: async () => new Response("") },
        USE_FIXTURES: "true",
      },
    );

    expect(response.status).toBe(200);

    const body = pullSyncResponseSchema.parse(await response.json());

    expect(body.zone).toEqual({ id: 53, name: "The Venomous Abyss" });
    expect(body.guild?.name).toBe("Average Pillagers");
    expect(body.guild?.region).toBe("EU");
    expect(body.owner).toBe("Dispy");
    expect(body.players).toHaveLength(22);
    expect(body.lanes).toHaveLength(LANES.length);
    expect(body.pulls).toHaveLength(22);
    expect(body.pulls.some((pull) => pull.deaths.length > 0)).toBe(true);
  });
});

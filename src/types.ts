export interface Fight {
  id: number;
  name: string;
  encounterID: number;
  startTime: number;
  endTime: number;
  kill: boolean | null;
  bossPercentage: number | null;
}

export interface ReportSummary {
  code: string;
  title: string;
  startTime: number;
  fights: Fight[];
}

export interface VodSummary {
  videoId: string;
  title: string;
  actualStartMs: number;
  durationSeconds: number;
}

export interface Pull {
  fightId: number;
  bossName: string;
  kill: boolean;
  pullNumber: number;
  durationMs: number;
  bossPercentage: number | null;
  /** Wall-clock epoch milliseconds when the pull started. */
  startedAt: number;
  /** Wall-clock epoch milliseconds when the pull ended. */
  endedAt: number;
  vodSeconds: number;
  inVod: boolean;
}

export interface PullSyncResponse {
  videoId: string;
  videoTitle: string;
  reportCode: string;
  reportTitle: string;
  /** Wall-clock epoch milliseconds of video second 0. */
  vodStartedAtMs: number;
  vodDurationSeconds: number;
  pulls: Pull[];
}

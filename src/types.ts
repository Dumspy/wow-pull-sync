export interface Fight {
  id: number;
  name: string;
  encounterID: number;
  startTime: number;
  endTime: number;
  kill: boolean | null;
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
  vodSeconds: number;
  inVod: boolean;
}

export interface PullSyncResponse {
  videoId: string;
  videoTitle: string;
  reportCode: string;
  reportTitle: string;
  vodDurationSeconds: number;
  pulls: Pull[];
}

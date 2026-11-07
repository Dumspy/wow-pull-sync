import type { VodErrorReason } from "./types";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reason?: VodErrorReason,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

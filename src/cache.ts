import { jsonBody, type Json } from "./json";

/** The part of a Workers KV namespace the cache uses. Tests pass an in-memory map. */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

/** How long a body from a finished report or a past stream stays cached. */
export const SETTLED_TTL_SECONDS = 7 * 24 * 60 * 60;

/** KV rejects an `expirationTtl` below 60 seconds. */
const MIN_TTL_SECONDS = 60;

/**
 * Upstream response bodies in KV, keyed by the request that produced them. Without a store
 * every load goes upstream. Writes run through `defer` so they don't hold up the response.
 */
export class UpstreamCache {
  hits = 0;
  misses = 0;

  constructor(
    private readonly store: CacheStore | undefined,
    private readonly defer: (work: Promise<void>) => void,
  ) {}

  /**
   * The cached body for `parts`, or the body from `load`. `ttlFor` returns how long the
   * loaded body may be kept, or null when it must not be cached (an error, a live report).
   */
  async json(
    prefix: string,
    parts: Json,
    load: () => Promise<Json>,
    ttlFor: (body: Json) => number | null,
  ): Promise<Json> {
    const store = this.store;

    if (!store) return load();

    const key = `${prefix}:${await sha256Hex(JSON.stringify(parts))}`;

    const cached = await store.get(key).catch(() => {
      console.warn("Cache read failed");

      return null;
    });

    if (cached != null) {
      const body = parseCached(cached);

      if (body !== undefined) {
        this.hits++;

        return body;
      }
    }

    this.misses++;

    const body = await load();
    const ttl = ttlFor(body);

    if (ttl != null) {
      this.defer(
        store
          .put(key, JSON.stringify(body), { expirationTtl: Math.max(ttl, MIN_TTL_SECONDS) })
          .catch(() => console.warn("Cache write failed")),
      );
    }

    return body;
  }
}

function parseCached(text: string): Json | undefined {
  try {
    const body = jsonBody.safeParse(JSON.parse(text));

    return body.success ? body.data : undefined;
  } catch {
    return undefined;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

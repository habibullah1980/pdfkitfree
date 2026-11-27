/** Small in-memory sliding-window limiter (per server instance). */
export function createBurstLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();
  return {
    /** True if `key` is still under the limit (does not record a hit). */
    allowed(key: string, now = Date.now()) {
      const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
      hits.set(key, list);
      if (hits.size > 5000) for (const k of Array.from(hits.keys()).slice(0, 1000)) hits.delete(k);
      return list.length < max;
    },
    record(key: string, now = Date.now()) {
      hits.set(key, [...(hits.get(key) || []), now]);
    },
    reset() {
      hits.clear();
    },
  };
}

export const feedbackBurstLimiter = createBurstLimiter(10 * 60 * 1000, 5);

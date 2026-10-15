/**
 * Window-bucketing math from api/_rateLimit.ts (lines 35–37):
 *
 *   windowStart = floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
 *
 * The DB UPSERT logic is exercised in integration tests; here we validate the
 * pure arithmetic: same-window timestamps share a bucket key, cross-window
 * timestamps don't.
 */
function windowStart(nowMs: number, windowSeconds: number): number {
  return Math.floor(nowMs / (windowSeconds * 1000)) * windowSeconds * 1000
}

describe('rate-limit window bucketing', () => {
  const W = 60 // 60-second windows

  it('two timestamps in the same window have the same bucket', () => {
    const t1 = 1_700_000_000_000
    const t2 = t1 + 5_000 // 5s later
    expect(windowStart(t1, W)).toBe(windowStart(t2, W))
  })

  it('a timestamp 1ms before window boundary stays in the prior window', () => {
    const start = windowStart(1_700_000_000_000, W)
    const justBefore = start + W * 1000 - 1
    expect(windowStart(justBefore, W)).toBe(start)
  })

  it('a timestamp at the next window boundary opens a new bucket', () => {
    const start = windowStart(1_700_000_000_000, W)
    const nextStart = start + W * 1000
    expect(windowStart(nextStart, W)).toBe(nextStart)
    expect(windowStart(nextStart, W)).not.toBe(start)
  })

  it('bucket boundaries are stable multiples of windowSeconds*1000', () => {
    const t = 1_700_000_037_421
    const ws = windowStart(t, W)
    expect(ws % (W * 1000)).toBe(0)
    expect(ws).toBeLessThanOrEqual(t)
    expect(ws + W * 1000).toBeGreaterThan(t)
  })

  it('different window sizes produce different buckets', () => {
    const t = 1_700_000_000_000
    expect(windowStart(t, 60)).not.toBe(windowStart(t + 65_000, 60))
    expect(windowStart(t, 600)).toBe(windowStart(t + 65_000, 600))
  })
})

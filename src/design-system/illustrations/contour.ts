/**
 * Contour-line geometry — the Nexus visual motif.
 *
 * Topographic contours: nested, organically wobbling closed rings around a
 * "summit". Rings for one hill never cross, because every ring uses the same
 * angular perturbation scaled by its radius (monotonic in k for every θ).
 *
 * Deterministic: the same seed always yields the same path, so SSR/tests and
 * the static `public/illustrations/contour.svg` stay in sync with the React
 * illustrations.
 */

export interface RingOptions {
  cx: number
  cy: number
  /** Horizontal radius. */
  r: number
  /** Vertical squash (ry = r × squash). Default 1. */
  squash?: number
  /** Perturbation amplitude as a fraction of the radius. Default 0.08. */
  wobble?: number
  seed?: number
  /** Sample count around the ring. Default 40. */
  points?: number
  /** Rotation of the perturbation in radians. */
  rotate?: number
}

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Closed Catmull-Rom spline through points → cubic Bézier path data. */
export function closedSpline(pts: Array<[number, number]>): string {
  const n = pts.length
  if (n < 3) return ''
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += `C${r1(c1x)} ${r1(c1y)} ${r1(c2x)} ${r1(c2y)} ${r1(p2[0])} ${r1(p2[1])}`
  }
  return d + 'Z'
}

/** Angular perturbation profile shared by every ring of one hill. */
function profile(seed: number) {
  const rand = rng(seed)
  const p = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2]
  return (theta: number) =>
    0.5 * Math.sin(2 * theta + p[0]) +
    0.28 * Math.sin(3 * theta + p[1]) +
    0.14 * Math.sin(5 * theta + p[2]) +
    0.08 * Math.sin(7 * theta + p[3])
}

export function contourRing({ cx, cy, r, squash = 1, wobble = 0.08, seed = 1, points = 40, rotate = 0 }: RingOptions): string {
  const f = profile(seed)
  const pts: Array<[number, number]> = []
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * Math.PI * 2
    const k = 1 + wobble * f(theta + rotate)
    pts.push([cx + Math.cos(theta) * r * k, cy + Math.sin(theta) * r * squash * k])
  }
  return closedSpline(pts)
}

export interface HillOptions {
  cx: number
  cy: number
  /** Radius of the innermost ring. */
  r0: number
  /** Radius increase per ring. */
  step: number
  count: number
  squash?: number
  wobble?: number
  seed?: number
  points?: number
  /** Drift of each successive ring's centre, so the hill leans (keep < step/3). */
  drift?: [number, number]
}

/** Nested contour rings around one summit, innermost first. */
export function contourHill({
  cx, cy, r0, step, count, squash = 1, wobble = 0.1, seed = 7, points = 44, drift = [0, 0],
}: HillOptions): string[] {
  const out: string[] = []
  for (let k = 0; k < count; k++) {
    out.push(
      contourRing({
        cx: cx + drift[0] * k,
        cy: cy + drift[1] * k,
        r: r0 + step * k,
        squash,
        // Outer rings wobble a touch more, like real terrain.
        wobble: wobble * (1 + k * 0.08),
        seed,
        points,
      }),
    )
  }
  return out
}

/** Path data for a circle (so circles can draw in like any other path). */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`
}

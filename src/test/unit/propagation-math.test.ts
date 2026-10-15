/**
 * Linked-data propagation — unit-conversion math.
 *
 * The propagator (api/_propagate.ts) computes a peer value as:
 *   peer_value = source_value * (peer.unit_conversion / source.unit_conversion)
 *
 * Replicated here as a pure helper so we can lock its behaviour without a
 * live database connection. Mirrors the formula exactly.
 */

function projectValue(sourceValue: number, sourceUnitConv: number, peerUnitConv: number): number {
  return sourceValue * (peerUnitConv / sourceUnitConv)
}

describe('Linked-data propagation: unit conversion', () => {
  it('passes the value through unchanged when both unit conversions are 1.0', () => {
    expect(projectValue(1234, 1, 1)).toBe(1234)
  })

  it('converts kg → tonnes with peer 0.001 multiplier', () => {
    // Source row reported in kg (unit_conversion 1.0). Peer reported in tonnes
    // (unit_conversion 0.001). 1500 kg → 1.5 tonnes.
    expect(projectValue(1500, 1, 0.001)).toBeCloseTo(1.5, 6)
  })

  it('round-trips through two complementary conversions', () => {
    // kg → t → kg
    const t = projectValue(2500, 1, 0.001)
    const kg = projectValue(t, 0.001, 1)
    expect(kg).toBeCloseTo(2500, 6)
  })

  it('handles fractional source values', () => {
    expect(projectValue(0.42, 1, 1)).toBeCloseTo(0.42, 6)
  })

  it('zero source value stays zero regardless of conversion', () => {
    expect(projectValue(0, 1, 0.001)).toBe(0)
    expect(projectValue(0, 0.001, 1)).toBe(0)
  })
})

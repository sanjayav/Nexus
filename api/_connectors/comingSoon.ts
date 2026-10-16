/**
 * Builder for catalogue-only ("coming soon") connectors.
 *
 * A coming-soon definition satisfies the full ConnectorDefinition interface so
 * it can be rendered by the same catalogue UI, but it can never pretend to be
 * live: testConnection always reports ok:false and fetchData always throws,
 * without touching the network or the database.
 */
import type { ConnectorDefinition, TestResult } from './index.js'

export type ComingSoonSpec = Omit<ConnectorDefinition, 'status' | 'testConnection' | 'fetchData'>

export const COMING_SOON_MESSAGE =
  'This connector is on the roadmap and not yet available — no live sync is performed. Use CSV import or a connector template in the meantime.'

export function comingSoonConnector(spec: ComingSoonSpec): ConnectorDefinition {
  return {
    ...spec,
    status: 'coming_soon',
    async testConnection(): Promise<TestResult> {
      return {
        ok: false,
        message: `${spec.name}: ${COMING_SOON_MESSAGE}`,
        details: { status: 'coming_soon' },
      }
    },
    async fetchData() {
      throw new Error(`${spec.name} connector is coming soon — live sync is not implemented`)
    },
  }
}

/** True when the definition is implemented and may be connected / synced. */
export function isLiveConnector(def: Pick<ConnectorDefinition, 'status'>): boolean {
  return (def.status ?? 'live') === 'live'
}

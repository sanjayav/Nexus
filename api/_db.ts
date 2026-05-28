import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

export type Region = 'us' | 'eu' | 'apac'
export type Sql = NeonQueryFunction<false, false>

const connections: Record<string, Sql | null> = {}

/**
 * Returns a Neon SQL client scoped to the org's data-residency region.
 * - Default (`getDb()`) preserves existing behaviour: always DATABASE_URL.
 * - `getDb('eu')` uses DATABASE_URL_EU if set, otherwise falls back to
 *   DATABASE_URL with a console warning (so dev stays functional before
 *   ops provisions the EU Neon project).
 * Connections are cached per-region.
 */
export function getDb(region: Region = 'us'): Sql {
  if (connections[region]) return connections[region]!
  let url: string | undefined
  if (region === 'eu') {
    url = process.env.DATABASE_URL_EU ?? process.env.DATABASE_URL
    if (!process.env.DATABASE_URL_EU) {
      // eslint-disable-next-line no-console
      console.warn('[getDb] region=eu requested but DATABASE_URL_EU not set — falling back to DATABASE_URL')
    }
  } else if (region === 'apac') {
    url = process.env.DATABASE_URL_APAC ?? process.env.DATABASE_URL
    if (!process.env.DATABASE_URL_APAC) {
      // eslint-disable-next-line no-console
      console.warn('[getDb] region=apac requested but DATABASE_URL_APAC not set — falling back to DATABASE_URL')
    }
  } else {
    url = process.env.DATABASE_URL
  }
  if (!url) throw new Error('DATABASE_URL not set')
  connections[region] = neon(url) as Sql
  return connections[region]!
}

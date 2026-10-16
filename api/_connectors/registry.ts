/**
 * Connector registry.
 *
 * Aggregates every provider under ./providers/ into a single record keyed by
 * provider id. Endpoints look adapters up by id and call into the
 * ConnectorDefinition interface — they don't need to know the implementation.
 *
 * Why a Record rather than an array: every callsite resolves by id. The
 * frontend tiles iterate via Object.values(); endpoint handlers do an O(1)
 * lookup via registry[providerId].
 */
import type { ConnectorDefinition } from './index.js'
import { sapS4hana } from './providers/sapS4hana.js'
import { oracleFusion } from './providers/oracleFusion.js'
import { netsuite } from './providers/netsuite.js'
import { workday } from './providers/workday.js'
import { salesforce } from './providers/salesforce.js'
import { snowflake } from './providers/snowflake.js'
import { aws } from './providers/aws.js'
import { gcp } from './providers/gcp.js'
import { azure } from './providers/azure.js'
import { genericRest } from './providers/genericRest.js'
import { CN_COMING_SOON_CONNECTORS } from './providers/cnCatalogue.js'

export const CONNECTORS: Record<string, ConnectorDefinition> = {
  [sapS4hana.id]: sapS4hana,
  [oracleFusion.id]: oracleFusion,
  [netsuite.id]: netsuite,
  [workday.id]: workday,
  [salesforce.id]: salesforce,
  [snowflake.id]: snowflake,
  [aws.id]: aws,
  [gcp.id]: gcp,
  [azure.id]: azure,
  [genericRest.id]: genericRest,
}

/**
 * Catalogue-only connectors (status 'coming_soon'). Deliberately NOT part of
 * CONNECTORS: listConnectors() feeds the "Live integrations" grid and
 * getConnector() gates OAuth start / callback / sync, so keeping these out
 * guarantees no endpoint or UI path treats them as connectable. Surface them
 * via listConnectorCatalogue() / getCatalogueEntry() with a "Coming soon"
 * badge instead.
 */
export const COMING_SOON_CONNECTORS: Record<string, ConnectorDefinition> = Object.fromEntries(
  CN_COMING_SOON_CONNECTORS.map(c => [c.id, c]),
)

/** Every catalogue entry — live first, then coming soon. */
export const CONNECTOR_CATALOGUE: Record<string, ConnectorDefinition> = {
  ...CONNECTORS,
  ...COMING_SOON_CONNECTORS,
}

/** Lookup a connector by id; returns undefined for unknown ids. */
export function getConnector(id: string): ConnectorDefinition | undefined {
  return CONNECTORS[id]
}

/** All registered providers as an array — used by the listing endpoint. */
export function listConnectors(): ConnectorDefinition[] {
  return Object.values(CONNECTORS)
}

/** Full catalogue (live + coming soon) — for a roadmap / marketplace view. */
export function listConnectorCatalogue(): ConnectorDefinition[] {
  return Object.values(CONNECTOR_CATALOGUE)
}

/** Lookup any catalogue entry, including coming-soon ones. */
export function getCatalogueEntry(id: string): ConnectorDefinition | undefined {
  return CONNECTOR_CATALOGUE[id]
}

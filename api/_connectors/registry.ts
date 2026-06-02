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

/** Lookup a connector by id; returns undefined for unknown ids. */
export function getConnector(id: string): ConnectorDefinition | undefined {
  return CONNECTORS[id]
}

/** All registered providers as an array — used by the listing endpoint. */
export function listConnectors(): ConnectorDefinition[] {
  return Object.values(CONNECTORS)
}

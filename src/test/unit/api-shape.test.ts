/**
 * Smoke-shape test for src/lib/api.ts. Catches accidental removal of a
 * namespace export (which would break consumers at runtime, not at compile
 * time, because most call sites use `import { auth } from '../lib/api'` and
 * the missing export only blows up when invoked).
 */
import * as api from '../../lib/api'

const REQUIRED_NAMESPACES = [
  'auth',
  'users',
  'roles',
  'permissions',
  'setup',
  'facilities',
  'activityData',
  'dashboard',
  'workflow',
  'blockchain',
  'reports',
  'analytics',
  'disclosures',
  'nexus',
  'ai',
  'scim',
  'apiKeys',
  'system',
  'connectors',
  'auditLog',
] as const

describe('src/lib/api.ts shape', () => {
  it.each(REQUIRED_NAMESPACES)('exports namespace "%s" as an object', (name) => {
    const ns = (api as unknown as Record<string, unknown>)[name]
    expect(ns).toBeDefined()
    expect(typeof ns).toBe('object')
  })

  it('exports setToken / clearToken token helpers', () => {
    expect(typeof api.setToken).toBe('function')
    expect(typeof api.clearToken).toBe('function')
  })

  it('auth namespace has login + me', () => {
    expect(typeof api.auth.login).toBe('function')
    expect(typeof api.auth.me).toBe('function')
  })
})

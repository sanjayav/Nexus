import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../server'
import {
  useIntegrationStatus,
  integrationMissing,
  integrationState,
  __resetIntegrationStatusCache,
} from '../../lib/integrations'

describe('useIntegrationStatus', () => {
  beforeEach(() => __resetIntegrationStatusCache())

  it('a 500 from /api/health is an error, not "AI not configured"', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ ok: false }, { status: 500 })))
    const { result } = renderHook(() => useIntegrationStatus())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('health_http_500')
    expect(integrationState(result.current, 'ai')).toBe('unknown')
    expect(integrationMissing(result.current, 'ai')).toBe(false)
  })

  it('a network failure is an error, not "not configured"', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()))
    const { result } = renderHook(() => useIntegrationStatus())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(integrationMissing(result.current, 'ai')).toBe(false)
  })

  it('reports missing only when the server says configured=false', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({
      ok: true,
      integrations: { ai: { configured: false }, email: { configured: true } },
    })))
    const { result } = renderHook(() => useIntegrationStatus())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(integrationMissing(result.current, 'ai')).toBe(true)
    expect(integrationState(result.current, 'email')).toBe('configured')
  })
})

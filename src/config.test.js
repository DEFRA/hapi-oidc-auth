import { setConfig, getConfig } from './config.js'

describe('#config', () => {
  // Runs first: the module has not been initialised yet.
  test('getConfig throws before the plugin is initialised', () => {
    expect(() => getConfig()).toThrow(/config not initialised/)
  })

  test('setConfig applies defraId defaults (mock mode, callback path, claim map)', () => {
    const cfg = setConfig({ defraId: {}, entra: {} })
    expect(cfg.defraId.mode).toBe('mock')
    expect(cfg.defraId.redirectPath).toBe('/auth/defra-id/callback')
    expect(cfg.defraId.claims.sub).toBe('sub')
  })

  test('setConfig applies default redirects and merges overrides', () => {
    const cfg = setConfig({
      defraId: {},
      entra: {},
      redirects: { applicant: '/start' }
    })
    expect(cfg.redirects.applicant).toBe('/start')
    expect(cfg.redirects.caseOfficer).toBe('/admin/applications')
    expect(cfg.redirects.signOut).toBe('/')
  })

  test('consumer claim overrides win over the defaults', () => {
    const cfg = setConfig({ defraId: { claims: { sub: 'oid' } }, entra: {} })
    expect(cfg.defraId.claims.sub).toBe('oid')
    expect(cfg.defraId.claims.email).toBe('email')
  })
})

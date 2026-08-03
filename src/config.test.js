import { setConfig, getConfig } from './config.js'

describe('#config', () => {
  // Runs first: the module has not been initialised yet.
  test('getConfig throws before the plugin is initialised', () => {
    expect(() => getConfig()).toThrow(/config not initialised/)
  })

  test('setConfig applies entra defaults (mock mode, callback path, role value)', () => {
    const cfg = setConfig({ entra: {} })
    expect(cfg.entra.mode).toBe('mock')
    expect(cfg.entra.redirectPath).toBe('/auth/entra/callback')
    expect(cfg.entra.caseOfficerRoleValue).toBe('case_officer')
  })

  test('setConfig applies default redirects and merges overrides', () => {
    const cfg = setConfig({
      entra: {},
      redirects: { caseOfficer: '/admin/home' }
    })
    expect(cfg.redirects.caseOfficer).toBe('/admin/home')
    expect(cfg.redirects.signOut).toBe('/')
  })

  test('consumer entra overrides win over the defaults', () => {
    const cfg = setConfig({ entra: { caseOfficerRoleValue: 'ocr_officer' } })
    expect(cfg.entra.caseOfficerRoleValue).toBe('ocr_officer')
    expect(cfg.entra.mode).toBe('mock')
  })
})

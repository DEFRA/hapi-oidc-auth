import { setConfig, getConfig } from './config.js'

describe('#config', () => {
  // Runs first: the module has not been initialised yet.
  test('getConfig throws before the plugin is initialised', () => {
    expect(() => getConfig()).toThrow(/config not initialised/)
  })

  test('setConfig applies entra defaults (mock mode, callback path, empty role values)', () => {
    const cfg = setConfig({ entra: {} })
    expect(cfg.entra.mode).toBe('mock')
    expect(cfg.entra.redirectPath).toBe('/auth/entra/callback')
    // No default: consumers must declare their own role value(s).
    expect(cfg.entra.roleValues).toEqual([])
  })

  test('setConfig applies default redirects and merges overrides', () => {
    const cfg = setConfig({
      entra: {},
      redirects: { postLogin: '/dashboard' }
    })
    expect(cfg.redirects.postLogin).toBe('/dashboard')
    expect(cfg.redirects.signOut).toBe('/')
  })

  test('roleValues are configurable per project (array or single string)', () => {
    expect(
      setConfig({ entra: { roleValues: ['ocr_officer'] } }).entra.roleValues
    ).toEqual(['ocr_officer'])
    // a single string is accepted and wrapped
    expect(
      setConfig({ entra: { roleValues: 'admin' } }).entra.roleValues
    ).toEqual(['admin'])
  })
})

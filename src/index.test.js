import Hapi from '@hapi/hapi'

import { hapiOidcAuth, PLUGIN_NAME } from './index.js'

const mockOptions = {
  entra: { mode: 'mock' },
  redirects: {
    postLogin: '/admin/applications',
    signOut: '/'
  }
}

describe('#hapiOidcAuth', () => {
  test('registers with valid options and exposes the resolved config', async () => {
    const server = Hapi.server()
    await server.register({ plugin: hapiOidcAuth, options: mockOptions })

    const exposed = server.plugins[PLUGIN_NAME].options
    expect(exposed.entra.mode).toBe('mock')
    expect(exposed.redirects.postLogin).toBe('/admin/applications')

    await server.stop()
  })

  test('does not expose the clientSecret on server.plugins', async () => {
    const server = Hapi.server()
    await server.register({
      plugin: hapiOidcAuth,
      options: {
        entra: { mode: 'live', clientSecret: 'super-secret', tenantId: 't' }
      }
    })

    const exposed = server.plugins[PLUGIN_NAME].options
    expect(exposed.entra.clientSecret).toBeUndefined()

    await server.stop()
  })

  test('throws a clear error when the entra option is missing', async () => {
    const server = Hapi.server()
    await expect(
      server.register({ plugin: hapiOidcAuth, options: {} })
    ).rejects.toThrow(/the `entra` option is required/)
  })

  test('fails closed on an unrecognised entra.mode (no silent downgrade to mock)', async () => {
    const server = Hapi.server()
    await expect(
      server.register({
        plugin: hapiOidcAuth,
        options: { entra: { mode: 'Live' } }
      })
    ).rejects.toThrow(/entra\.mode must be "mock" or "live"/)
  })
})

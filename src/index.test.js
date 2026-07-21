import Hapi from '@hapi/hapi'

import { hapiOidcAuth, PLUGIN_NAME } from './index.js'

const mockOptions = {
  defraId: { mode: 'mock' },
  entra: { mode: 'mock' },
  redirects: {
    applicant: '/register/type',
    caseOfficer: '/admin/applications',
    signOut: '/'
  }
}

describe('#hapiOidcAuth', () => {
  test('registers with valid options and exposes the resolved config', async () => {
    const server = Hapi.server()
    await server.register({ plugin: hapiOidcAuth, options: mockOptions })

    const exposed = server.plugins[PLUGIN_NAME].options
    expect(exposed.defraId.mode).toBe('mock')
    expect(exposed.entra.mode).toBe('mock')
    expect(exposed.redirects.caseOfficer).toBe('/admin/applications')

    await server.stop()
  })

  test('throws a clear error when defraId or entra options are missing', async () => {
    const server = Hapi.server()
    await expect(
      server.register({ plugin: hapiOidcAuth, options: {} })
    ).rejects.toThrow(/both `defraId` and `entra` options are required/)
  })
})

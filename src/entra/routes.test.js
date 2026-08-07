import { buildTestServer } from '../../test-helpers/view-server.js'

const mockOptions = {
  entra: { mode: 'mock' },
  redirects: { postLogin: '/admin/applications' }
}

describe('entra routes (mock mode)', () => {
  let server

  beforeAll(async () => {
    server = await buildTestServer(mockOptions)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /auth/entra/sign-in renders the staff sign-in page with a start button', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/auth/entra/sign-in'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain('data-testid="entra-start"')
    expect(res.result).toContain('Sign in')
  })

  test('GET /auth/entra/start redirects to the mock callback carrying state', async () => {
    const res = await server.inject({ method: 'GET', url: '/auth/entra/start' })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toContain(
      '/auth/entra/callback?code=mock-auth-code&state='
    )
  })

  test('the mock journey completes and lands the case officer on the admin home', async () => {
    const start = await server.inject({
      method: 'GET',
      url: '/auth/entra/start'
    })
    const cookie = start.headers['set-cookie'][0].split(';')[0]

    const callback = await server.inject({
      method: 'GET',
      url: start.headers.location,
      headers: { cookie }
    })

    expect(callback.statusCode).toBe(302)
    expect(callback.headers.location).toBe('/admin/applications')
  })
})

describe('entra routes (live mode)', () => {
  let server

  beforeAll(async () => {
    server = await buildTestServer({
      entra: {
        mode: 'live',
        tenantId: 'tid',
        clientId: 'entra-client',
        clientSecret: 'entra-secret',
        publicBaseUrl: 'https://app.example'
      },
      redirects: { postLogin: '/admin/applications' }
    })
  })

  afterAll(async () => {
    await server.stop()
  })

  // Proves the thrown .statusCode survives to the HTTP response via the host's
  // onPreResponse boundary — i.e. a bad callback is 422, not a boomified 500.
  test('a live callback with a bad state returns 422 (not 500) end-to-end', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/auth/entra/callback',
      payload: { code: 'some-code', state: 'does-not-match-session' }
    })

    expect(res.statusCode).toBe(422)
  })
})

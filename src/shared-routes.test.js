import { buildTestServer } from '../test-helpers/view-server.js'

const mockOptions = { entra: { mode: 'mock' } }

// Complete a mock case-officer sign-in and return the authenticated session cookie.
async function signInCaseOfficer(server) {
  const start = await server.inject({
    method: 'GET',
    url: '/auth/entra/start'
  })
  const startCookie = start.headers['set-cookie'][0].split(';')[0]
  const callback = await server.inject({
    method: 'GET',
    url: start.headers.location,
    headers: { cookie: startCookie }
  })
  const setCookie = callback.headers['set-cookie']
  return (setCookie ? setCookie[0] : startCookie).split(';')[0]
}

describe('shared auth routes (mock mode)', () => {
  let server

  beforeAll(async () => {
    server = await buildTestServer(mockOptions)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /auth/account redirects an unauthenticated visitor to the Entra sign-in', async () => {
    const res = await server.inject({ method: 'GET', url: '/auth/account' })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/auth/entra/sign-in?error=auth-required')
  })

  test('GET /auth/account renders the account page for a signed-in user', async () => {
    const cookie = await signInCaseOfficer(server)
    const res = await server.inject({
      method: 'GET',
      url: '/auth/account',
      headers: { cookie }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain('data-testid="account-summary"')
    expect(res.result).toContain('Casey Officer')
  })

  test('GET /auth/sign-out clears the session and redirects home (mock)', async () => {
    const cookie = await signInCaseOfficer(server)
    const res = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie }
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })
})

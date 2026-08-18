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
    expect(res.result).toContain('Sam Taylor')
  })

  test('POST /auth/sign-out (same-origin) clears the session and redirects home (mock)', async () => {
    const cookie = await signInCaseOfficer(server)
    const res = await server.inject({
      method: 'POST',
      url: '/auth/sign-out',
      headers: { cookie, 'sec-fetch-site': 'same-origin' }
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })

  test('GET /auth/sign-out is not allowed (CSRF: sign-out is POST-only)', async () => {
    const cookie = await signInCaseOfficer(server)
    const res = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie }
    })

    // A cross-site GET (link/image) must not be able to trigger sign-out.
    expect(res.statusCode).toBe(404)
  })

  test('POST /auth/sign-out from a cross-site form is rejected (CSRF)', async () => {
    const cookie = await signInCaseOfficer(server)
    const res = await server.inject({
      method: 'POST',
      url: '/auth/sign-out',
      headers: { cookie, 'sec-fetch-site': 'cross-site' }
    })

    // An attacker page auto-submitting a cross-site form must not sign the user
    // out (the SameSite=None cookie would otherwise ride along).
    expect(res.statusCode).toBe(403)
  })
})

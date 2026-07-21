import { buildTestServer } from '../test-helpers/view-server.js'

const mockOptions = { defraId: { mode: 'mock' }, entra: { mode: 'mock' } }

// Complete a mock applicant sign-in and return the authenticated session cookie.
async function signInApplicant(server) {
  const start = await server.inject({
    method: 'GET',
    url: '/auth/defra-id/start'
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

  test('GET /auth/sign-in renders the chooser with both populations', async () => {
    const res = await server.inject({ method: 'GET', url: '/auth/sign-in' })

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain('data-testid="choose-applicant"')
    expect(res.result).toContain('data-testid="choose-case-officer"')
  })

  test('GET /auth/account redirects an unauthenticated visitor to the chooser', async () => {
    const res = await server.inject({ method: 'GET', url: '/auth/account' })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/auth/sign-in?error=auth-required')
  })

  test('GET /auth/account renders the account page for a signed-in user', async () => {
    const cookie = await signInApplicant(server)
    const res = await server.inject({
      method: 'GET',
      url: '/auth/account',
      headers: { cookie }
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain('data-testid="account-summary"')
    expect(res.result).toContain('Alex Applicant')
  })

  test('GET /auth/sign-out clears the session and redirects home (mock)', async () => {
    const cookie = await signInApplicant(server)
    const res = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie }
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe('/')
  })
})

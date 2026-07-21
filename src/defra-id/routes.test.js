import { buildTestServer } from '../../test-helpers/view-server.js'

const mockOptions = { defraId: { mode: 'mock' }, entra: { mode: 'mock' } }

describe('defra-id routes (mock mode)', () => {
  let server

  beforeAll(async () => {
    server = await buildTestServer(mockOptions)
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /auth/defra-id/sign-in renders the sign-in page with a start button', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/auth/defra-id/sign-in'
    })

    expect(res.statusCode).toBe(200)
    expect(res.result).toContain('data-testid="defra-id-start"')
    expect(res.result).toContain('Sign in to apply')
    // Mock mode is surfaced on the page.
    expect(res.result).toContain('data-testid="auth-mode"')
  })

  test('GET /auth/defra-id/start redirects to the mock callback carrying state', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/auth/defra-id/start'
    })

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toContain(
      '/auth/defra-id/callback?code=mock-auth-code&state='
    )
  })

  test('the mock journey completes and lands the applicant on the applicant home', async () => {
    const start = await server.inject({
      method: 'GET',
      url: '/auth/defra-id/start'
    })
    const cookie = start.headers['set-cookie'][0].split(';')[0]

    const callback = await server.inject({
      method: 'GET',
      url: start.headers.location,
      headers: { cookie }
    })

    expect(callback.statusCode).toBe(302)
    expect(callback.headers.location).toBe('/register/type')
  })
})

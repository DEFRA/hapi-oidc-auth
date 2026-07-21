import { buildTestServer } from '../../test-helpers/view-server.js'

const mockOptions = { defraId: { mode: 'mock' }, entra: { mode: 'mock' } }

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
    expect(res.result).toContain('Case officer sign in')
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

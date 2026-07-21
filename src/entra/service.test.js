import { setConfig } from '../config.js'

import {
  completeEntraCallback,
  getEntraSummary,
  signOutEntra,
  startEntraSignIn
} from './service.js'
import { getAuthSession } from '../session.js'
import {
  generateTestKeyPair,
  idTokenClaims,
  signIdToken
} from '../../test-helpers/oidc-test-keys.js'

const ISSUER = 'https://login.microsoftonline.com/tid/v2.0'
const DISCOVERY = {
  issuer: ISSUER,
  authorization_endpoint:
    'https://login.microsoftonline.com/tid/oauth2/v2.0/authorize',
  token_endpoint: 'https://login.microsoftonline.com/tid/oauth2/v2.0/token',
  jwks_uri: 'https://login.microsoftonline.com/tid/discovery/v2.0/keys',
  end_session_endpoint:
    'https://login.microsoftonline.com/tid/oauth2/v2.0/logout'
}

const keyPair = generateTestKeyPair('entra-svc-kid')

function stubFetch(routes) {
  return vi.fn(async (url) => {
    const key = Object.keys(routes).find((part) => String(url).includes(part))
    const route = key
      ? routes[key]
      : { ok: false, status: 404, body: { error: 'not_found' } }
    return {
      ok: route.ok !== false,
      status: route.status || 200,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(route.body ?? {})
    }
  })
}

function fakeRequest(initial = {}) {
  const store = { ...initial }
  return {
    yar: {
      get: (key) => store[key],
      set: (key, value) => {
        store[key] = value
      },
      clear: (key) => {
        delete store[key]
      }
    },
    info: { host: 'app.example' },
    url: { protocol: 'https:' }
  }
}

function setLiveConfig() {
  setConfig({
    defraId: { mode: 'mock' },
    entra: {
      mode: 'live',
      tenantId: 'tid',
      clientId: 'entra-client',
      clientSecret: 'entra-secret',
      signOutRedirectUrl: 'https://app.example/bye'
    }
  })
}

beforeEach(() => {
  setConfig({ defraId: { mode: 'mock' }, entra: { mode: 'mock' } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('#getEntraSummary (live)', () => {
  test('derives the redirect URI from the request host', () => {
    setLiveConfig()
    const summary = getEntraSummary(fakeRequest())
    expect(summary.isLive).toBe(true)
    expect(summary.redirectUri).toBe('https://app.example/auth/entra/callback')
  })
})

describe('#startEntraSignIn / #completeEntraCallback (live)', () => {
  test('starts the live flow then completes the callback into a case-officer session', async () => {
    setLiveConfig()
    vi.stubGlobal('fetch', stubFetch({ '.well-known': { body: DISCOVERY } }))

    const request = fakeRequest()
    const start = await startEntraSignIn(request, {
      returnTo: '/admin/applications'
    })
    expect(start.mode).toBe('live')

    const pending = getAuthSession(request)
    const idToken = signIdToken(
      idTokenClaims({
        iss: ISSUER,
        aud: 'entra-client',
        oid: 'oid-1',
        preferred_username: 'co@defra.gov.uk',
        roles: ['case_officer'],
        nonce: pending.pendingNonce
      }),
      keyPair
    )
    vi.stubGlobal(
      'fetch',
      stubFetch({
        '.well-known': { body: DISCOVERY },
        '/v2.0/token': {
          body: { id_token: idToken, token_type: 'Bearer', expires_in: 3600 }
        },
        '/keys': { body: { keys: [keyPair.publicJwk] } }
      })
    )

    const result = await completeEntraCallback(request, {
      code: 'code-1',
      state: pending.pendingState
    })

    expect(result.profile.role).toBe('case_officer')
    const session = getAuthSession(request)
    expect(session.isAuthenticated).toBe(true)
    expect(session.provider).toBe('microsoft-entra-id')
  })
})

describe('#completeEntraCallback (mock)', () => {
  test('signs in the mock case officer and steers to the case-officer home', async () => {
    const request = fakeRequest()
    const start = await startEntraSignIn(request)
    expect(start.mode).toBe('mock')

    const pending = getAuthSession(request)
    const result = await completeEntraCallback(request, {
      code: 'mock-auth-code',
      state: pending.pendingState
    })

    expect(result.returnTo).toBe('/admin/applications')
    const session = getAuthSession(request)
    expect(session.isAuthenticated).toBe(true)
    expect(session.role).toBe('case_officer')
    expect(session.provider).toBe('microsoft-entra-id')
  })
})

describe('#signOutEntra (live)', () => {
  test('returns the end-session URL and clears the session', async () => {
    setLiveConfig()
    vi.stubGlobal('fetch', stubFetch({ '.well-known': { body: DISCOVERY } }))

    const request = fakeRequest({
      auth: {
        isAuthenticated: true,
        idTokenHint: 'token-hint',
        provider: 'microsoft-entra-id',
        mode: 'live'
      }
    })

    const url = await signOutEntra(request)
    expect(url).toContain('/logout')
    expect(getAuthSession(request).isAuthenticated).toBe(false)
  })
})

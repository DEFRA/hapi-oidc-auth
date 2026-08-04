import { setConfig } from './config.js'
import {
  PAGE_PATHS,
  applyProfile,
  buildAuthDefaults,
  clearAuthSession,
  createAuthError,
  getAuthSession,
  isAuthenticated,
  requireAuth,
  requireCaseOfficer,
  resolveBaseUrl,
  resolvePostLoginRedirect
} from './session.js'

// resolvePostLoginRedirect reads the configured redirects, so initialise the
// config holder before each test (postLogin defaults to '/').
beforeEach(() => {
  setConfig({ entra: { mode: 'mock' }, redirects: { postLogin: '/dashboard' } })
})

function fakeYar(initial = {}) {
  const store = { ...initial }
  return {
    get: (key) => store[key],
    set: (key, value) => {
      store[key] = value
    },
    clear: (key) => {
      delete store[key]
    }
  }
}

const CONTINUE = Symbol('continue')

function fakeH() {
  return {
    continue: CONTINUE,
    redirect(url) {
      return {
        url,
        takeover() {
          return { isTakeover: true, url }
        }
      }
    },
    response(payload) {
      return {
        payload,
        code(statusCode) {
          this.statusCode = statusCode
          return this
        },
        takeover() {
          this.isTakeover = true
          return this
        }
      }
    }
  }
}

describe('#resolvePostLoginRedirect', () => {
  test('defaults to the configured post-login page', () => {
    expect(resolvePostLoginRedirect('')).toBe('/dashboard')
  })

  test('honours a safe local returnTo (deep-link back to the attempted page)', () => {
    expect(resolvePostLoginRedirect('/admin/applications')).toBe(
      '/admin/applications'
    )
  })

  test('blocks open-redirect (protocol-relative) returnTo', () => {
    expect(resolvePostLoginRedirect('//evil.example.com')).toBe('/dashboard')
  })

  test('blocks open-redirect (backslash) returnTo', () => {
    // Browsers normalise `/\evil.com` to `https://evil.com` in a Location header.
    expect(resolvePostLoginRedirect('/\\evil.example.com')).toBe('/dashboard')
  })
})

describe('#getAuthSession', () => {
  test('returns defaults when nothing is stored', () => {
    const request = { yar: fakeYar() }
    expect(getAuthSession(request)).toEqual(buildAuthDefaults())
  })

  test('merges stored values over defaults', () => {
    const request = {
      yar: fakeYar({ auth: { name: 'Alex Grower', isAuthenticated: true } })
    }
    const session = getAuthSession(request)
    expect(session.name).toBe('Alex Grower')
    expect(session.isAuthenticated).toBe(true)
    // Role stays neutral until authentication assigns one.
    expect(session.role).toBe('')
  })
})

describe('#applyProfile', () => {
  test('writes an authenticated session with downstream scope and clears pending state', async () => {
    const request = {
      yar: fakeYar({ auth: { ...buildAuthDefaults(), pendingState: 'mock-1' } })
    }

    const profile = {
      subject: 'urn:staff',
      email: 'casey.officer@example.gov.uk',
      name: 'Casey Officer',
      role: 'case_officer',
      roles: ['case_officer']
    }

    const session = await applyProfile(request, {
      provider: 'microsoft-entra-id',
      profile,
      mode: 'mock'
    })

    expect(session.isAuthenticated).toBe(true)
    expect(session.provider).toBe('microsoft-entra-id')
    expect(session.role).toBe('case_officer')
    expect(session.roleLabel).toBe('Case officer')
    expect(session.scope).toContain('case_officer')
    expect(session.pendingState).toBe('')
  })

  test('an empty/unknown role is NOT granted applicant scope', async () => {
    // e.g. an Entra user whose token lacks the case-officer claim → role ''.
    const request = { yar: fakeYar({ auth: buildAuthDefaults() }) }

    const session = await applyProfile(request, {
      provider: 'microsoft-entra-id',
      profile: { subject: 'urn:staff', name: 'No Role', role: '', roles: [] },
      mode: 'mock'
    })

    expect(session.role).toBe('')
    expect(session.scope).not.toContain('applicant')
    expect(session.scope).not.toContain('case_officer')
  })
})

describe('#clearAuthSession', () => {
  test('resets the session to defaults', () => {
    const request = {
      yar: fakeYar({ auth: { isAuthenticated: true, name: 'Alex' } })
    }
    const cleared = clearAuthSession(request)
    expect(cleared.isAuthenticated).toBe(false)
    expect(getAuthSession(request).name).toBe('')
  })
})

describe('#requireAuth', () => {
  test('continues when authenticated', () => {
    const request = {
      yar: fakeYar({ auth: { isAuthenticated: true } }),
      url: { pathname: '/auth/account', search: '' }
    }
    expect(requireAuth(request, fakeH())).toBe(CONTINUE)
  })

  test('redirects to the Entra sign-in (with returnTo stashed) when not authenticated', () => {
    const request = {
      yar: fakeYar(),
      url: { pathname: '/auth/account', search: '' }
    }
    const result = requireAuth(request, fakeH())
    expect(result.isTakeover).toBe(true)
    expect(result.url).toContain(PAGE_PATHS.ENTRA_SIGN_IN)
    expect(getAuthSession(request).returnTo).toBe('/auth/account')
  })
})

describe('#requireCaseOfficer', () => {
  test('redirects an unauthenticated user to the Entra sign-in', () => {
    const request = { yar: fakeYar(), url: { pathname: '/admin', search: '' } }
    const result = requireCaseOfficer(request, fakeH())
    expect(result.url).toContain(PAGE_PATHS.ENTRA_SIGN_IN)
  })

  test('404s an applicant trying to reach a case-officer page', () => {
    const request = {
      yar: fakeYar({
        auth: { isAuthenticated: true, role: 'applicant' }
      }),
      url: { pathname: '/admin', search: '' }
    }
    const result = requireCaseOfficer(request, fakeH())
    expect(result.statusCode).toBe(404)
  })

  test('continues when the case officer role matches', () => {
    const request = {
      yar: fakeYar({
        auth: { isAuthenticated: true, role: 'case_officer' }
      }),
      url: { pathname: '/admin', search: '' }
    }
    expect(requireCaseOfficer(request, fakeH())).toBe(CONTINUE)
  })
})

describe('#isAuthenticated', () => {
  test('reflects the stored session flag', () => {
    expect(isAuthenticated({ yar: fakeYar() })).toBe(false)
    expect(
      isAuthenticated({ yar: fakeYar({ auth: { isAuthenticated: true } }) })
    ).toBe(true)
  })
})

describe('#createAuthError', () => {
  test('carries a status code and details', () => {
    const error = createAuthError(422, 'bad', [{ field: 'x' }])
    expect(error).toBeInstanceOf(Error)
    expect(error.statusCode).toBe(422)
    expect(error.details).toEqual([{ field: 'x' }])
  })
})

describe('#resolveBaseUrl', () => {
  test('prefers the configured base URL', () => {
    expect(resolveBaseUrl({}, 'https://configured.example')).toBe(
      'https://configured.example'
    )
  })

  test('derives from the request host when not configured', () => {
    const request = {
      url: { protocol: 'https:' },
      info: { host: 'app.example' }
    }
    expect(resolveBaseUrl(request, '')).toBe('https://app.example')
  })

  test('returns empty string when no host is available', () => {
    expect(resolveBaseUrl({}, '')).toBe('')
  })
})

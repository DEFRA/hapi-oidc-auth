// Defra Customer Identity (Azure AD B2C) sign-in orchestration — EXTERNAL applicants.
//
// Dispatches between `mock` (local identities, no credentials) and `live` (real
// B2C over the framework-agnostic client in ./client.js).

import { getConfig } from '../config.js'

import {
  getDefraIdConfigSummary,
  startLiveDefraId,
  completeLiveDefraId,
  buildDefraIdSignOutUrl
} from './client.js'
import { buildMockDefraIdIdentity } from '../mock-identities.js'
import { HTTP_UNPROCESSABLE_ENTITY } from '../oidc-common.js'
import {
  DEFRA_ID_PROVIDER,
  applyProfile,
  clearAuthSession,
  createAuthError,
  getAuthSession,
  resolveBaseUrl,
  setAuthSession
} from '../session.js'

function baseUrlFor(request) {
  return resolveBaseUrl(request, getConfig().defraId.publicBaseUrl)
}

export function getDefraIdSummary(request) {
  return getDefraIdConfigSummary(baseUrlFor(request))
}

// Begin sign-in. Returns the URL to redirect the browser to: in mock mode a local
// callback that immediately completes; in live mode the B2C authorize endpoint.
export async function startDefraIdSignIn(request, options = {}) {
  const summary = getDefraIdSummary(request)
  const session = getAuthSession(request)
  session.returnTo =
    options.returnTo || session.returnTo || getConfig().redirects.applicant

  if (!summary.isLive) {
    // Defra Identity is the applicant IdP only; case officers use Entra.
    session.pendingState = `mock-${Date.now()}`
    session.pendingNonce = `mock-nonce-${Date.now()}`
    session.pkceVerifier = ''
    session.pendingRedirectUri = ''
    session.pendingIdentity = 'applicant'
    session.mode = 'mock'
    setAuthSession(request, session)

    return {
      mode: 'mock',
      authorizationUrl: `/auth/defra-id/callback?code=mock-auth-code&state=${session.pendingState}`
    }
  }

  const start = await startLiveDefraId(baseUrlFor(request), {
    returnTo: session.returnTo,
    forceReselection: options.forceReselection,
    relationshipId: options.relationshipId,
    loginHint: options.loginHint
  })

  session.pendingState = start.state
  session.pendingNonce = start.nonce
  session.pkceVerifier = start.pkceVerifier
  session.pendingRedirectUri = start.redirectUri
  session.pendingIdentity = 'applicant'
  session.mode = 'live'
  setAuthSession(request, session)

  return { mode: 'live', authorizationUrl: start.authorizationUrl }
}

// Complete the callback. Verifies state, resolves the profile (mock identity or live
// token exchange), and writes the authenticated session. Returns the post-login target.
export async function completeDefraIdCallback(request, query = {}) {
  const summary = getDefraIdSummary(request)
  const session = getAuthSession(request)
  const applicantHome = getConfig().redirects.applicant

  if (!summary.isLive) {
    if (
      !query.state ||
      !session.pendingState ||
      query.state !== session.pendingState
    ) {
      throw createAuthError(
        HTTP_UNPROCESSABLE_ENTITY,
        'Unable to verify applicant sign-in state'
      )
    }

    const profile = buildMockDefraIdIdentity()
    await applyProfile(request, {
      provider: DEFRA_ID_PROVIDER,
      profile,
      mode: 'mock'
    })
    return { returnTo: session.returnTo || applicantHome, profile }
  }

  const result = await completeLiveDefraId(
    { code: query.code, state: query.state },
    {
      state: session.pendingState,
      nonce: session.pendingNonce,
      pkceVerifier: session.pkceVerifier,
      redirectUri: session.pendingRedirectUri,
      returnTo: session.returnTo
    }
  )

  await applyProfile(request, {
    provider: DEFRA_ID_PROVIDER,
    profile: result.profile,
    tokens: {
      token: result.token,
      idToken: result.idToken,
      refreshToken: result.refreshToken
    },
    mode: 'live'
  })

  return {
    returnTo: result.returnTo || applicantHome,
    profile: result.profile
  }
}

// Sign out: capture any live end-session URL, then clear the local session.
export async function signOutDefraId(request) {
  const session = getAuthSession(request)
  const signOutUrl = await buildDefraIdSignOutUrl(
    baseUrlFor(request),
    session.idTokenHint
  )
  clearAuthSession(request)
  return signOutUrl
}

// Microsoft Entra ID sign-in orchestration — INTERNAL case officers / staff.
//
// Mirrors the Defra Identity service but for the staff IdP (OIDC auth-code + PKCE).
// Dispatches mock vs live over the framework-agnostic ./client.js. Staff have no
// external-organisation context.

import { getConfig } from '../config.js'

import {
  getEntraConfigSummary,
  startLiveEntra,
  completeLiveEntra,
  buildEntraSignOutUrl
} from './client.js'
import { buildMockEntraIdentity } from '../mock-identities.js'
import { HTTP_UNPROCESSABLE_ENTITY } from '../oidc-common.js'
import {
  ENTRA_PROVIDER,
  applyProfile,
  clearAuthSession,
  createAuthError,
  getAuthSession,
  resolveBaseUrl,
  setAuthSession
} from '../session.js'

function baseUrlFor(request) {
  return resolveBaseUrl(request, getConfig().entra.publicBaseUrl)
}

export function getEntraSummary(request) {
  return getEntraConfigSummary(baseUrlFor(request))
}

export async function startEntraSignIn(request, options = {}) {
  const summary = getEntraSummary(request)
  const session = getAuthSession(request)
  session.returnTo =
    options.returnTo || session.returnTo || getConfig().redirects.caseOfficer

  if (!summary.isLive) {
    session.pendingState = `mock-entra-${Date.now()}`
    session.pendingNonce = `mock-entra-nonce-${Date.now()}`
    session.pkceVerifier = ''
    session.pendingRedirectUri = ''
    session.pendingIdentity = 'case_officer'
    session.mode = 'mock'
    setAuthSession(request, session)

    return {
      mode: 'mock',
      authorizationUrl: `/auth/entra/callback?code=mock-auth-code&state=${session.pendingState}`
    }
  }

  const start = await startLiveEntra(baseUrlFor(request), {
    returnTo: session.returnTo,
    loginHint: options.loginHint
  })

  session.pendingState = start.state
  session.pendingNonce = start.nonce
  session.pkceVerifier = start.pkceVerifier
  session.pendingRedirectUri = start.redirectUri
  session.pendingIdentity = 'case_officer'
  session.mode = 'live'
  setAuthSession(request, session)

  return { mode: 'live', authorizationUrl: start.authorizationUrl }
}

export async function completeEntraCallback(request, query = {}) {
  const summary = getEntraSummary(request)
  const session = getAuthSession(request)
  const caseOfficerHome = getConfig().redirects.caseOfficer

  if (!summary.isLive) {
    if (
      !query.state ||
      !session.pendingState ||
      query.state !== session.pendingState
    ) {
      throw createAuthError(
        HTTP_UNPROCESSABLE_ENTITY,
        'Unable to verify Microsoft Entra sign-in state'
      )
    }

    const profile = buildMockEntraIdentity()
    await applyProfile(request, {
      provider: ENTRA_PROVIDER,
      profile,
      mode: 'mock'
    })
    return { returnTo: session.returnTo || caseOfficerHome, profile }
  }

  const result = await completeLiveEntra(
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
    provider: ENTRA_PROVIDER,
    profile: result.profile,
    tokens: {
      token: result.token,
      idToken: result.idToken,
      refreshToken: result.refreshToken
    },
    mode: 'live'
  })

  return {
    returnTo: result.returnTo || caseOfficerHome,
    profile: result.profile
  }
}

export async function signOutEntra(request) {
  const session = getAuthSession(request)
  const signOutUrl = await buildEntraSignOutUrl(
    baseUrlFor(request),
    session.idTokenHint
  )
  clearAuthSession(request)
  return signOutUrl
}

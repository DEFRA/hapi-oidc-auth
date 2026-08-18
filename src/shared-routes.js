// Shared auth routes.
//
//   POST /auth/sign-out  sign out of Entra and clear the local session
//   GET  /auth/account   authenticated "who am I" page (session diagnostic / landing)
//
// Sign-out is state-changing, so it is POST-only AND rejects cross-site POSTs.
// The live session cookie is SameSite=None, so without this a cross-site request
// could silently sign a user out (logout CSRF): POST-only blocks the passive
// vectors (link / image / prefetch / plain navigation), and the Sec-Fetch-Site
// check blocks an attacker page that auto-submits a cross-site form — in browsers
// that send Fetch Metadata (all current browsers). Clients without it (e.g. Safari
// < 16.4, some WebViews, non-browser clients) fall back to POST-only; the only
// residual risk is a forced logout (no data exposure).

import { getConfig } from './config.js'
import { LANG_EN } from './content.js'
import { signOutEntra } from './entra/service.js'
import { statusCodes } from './status-codes.js'
import { PAGE_PATHS, getAuthSession, requireAuth } from './session.js'

// Sec-Fetch-Site is set by the browser and cannot be forged by a page: a
// same-origin form submit sends `same-origin`, while `cross-site` and
// `same-site` (sibling subdomains) are rejected. A compromised sibling
// subdomain can auto-submit a form with `Sec-Fetch-Site: same-site` and the
// browser will still attach cookies for the destination host, so trusting
// same-site leaves logout CSRF possible. When the header is absent (clients
// without Fetch Metadata) we allow the request: the only risk is a forced
// logout, and blocking would break sign-out for them.
function isCrossSiteRequest(request) {
  const fetchSite = request.headers['sec-fetch-site']
  return fetchSite === 'cross-site' || fetchSite === 'same-site'
}

const signOut = {
  async handler(request, h) {
    if (isCrossSiteRequest(request)) {
      return h
        .response('Cross-site sign-out is not allowed')
        .code(statusCodes.forbidden)
    }

    // signOutEntra builds a live end-session URL (if configured) before clearing
    // the local session, then returns it; fall back to the configured redirect.
    const signOutUrl = await signOutEntra(request)
    return h.redirect(signOutUrl || getConfig().redirects.signOut)
  }
}

const account = {
  options: { pre: [{ method: requireAuth }] },
  handler(request, h) {
    const { account: accountContent } = getConfig().content
    const session = getAuthSession(request)

    return h.view('account', {
      pageTitle: accountContent.pageTitle,
      heading: accountContent.heading,
      t: accountContent,
      session,
      lang: LANG_EN
    })
  }
}

export const sharedAuthRoutes = {
  plugin: {
    name: 'auth-shared',
    register(server) {
      server.route([
        { method: 'POST', path: PAGE_PATHS.SIGN_OUT, ...signOut },
        { method: 'GET', path: PAGE_PATHS.ACCOUNT, ...account }
      ])
    }
  }
}

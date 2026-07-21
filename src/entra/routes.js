// Microsoft Entra ID sign-in routes — INTERNAL case officers / staff.
//
//   GET /auth/entra/sign-in    render the staff sign-in page
//   GET /auth/entra/start      begin sign-in, redirect to Entra (or mock callback)
//   GET|POST /auth/entra/callback complete sign-in, redirect to the post-login page

import { getConfig } from '../config.js'
import { LANG_EN } from '../content.js'
import {
  getEntraSummary,
  startEntraSignIn,
  completeEntraCallback
} from './service.js'
import {
  PAGE_PATHS,
  getAuthSession,
  resolvePostLoginRedirect
} from '../session.js'

const signInPage = {
  handler(request, h) {
    const { entraSignIn, authShared } = getConfig().content
    const summary = getEntraSummary(request)
    const session = getAuthSession(request)
    const { returnTo, error } = request.query

    return h.view('entra/sign-in', {
      pageTitle: entraSignIn.pageTitle,
      heading: entraSignIn.heading,
      t: entraSignIn,
      shared: authShared,
      summary,
      session,
      returnTo: returnTo || '',
      authError: error || '',
      lang: LANG_EN
    })
  }
}

const startSignIn = {
  async handler(request, h) {
    const { returnTo } = request.query
    const { authorizationUrl } = await startEntraSignIn(request, { returnTo })
    return h.redirect(authorizationUrl)
  }
}

const callback = {
  async handler(request, h) {
    // Live uses response_mode=form_post (code in the POST body); mock redirects
    // back with query params. Accept whichever is present.
    const params =
      request.payload && Object.keys(request.payload).length
        ? request.payload
        : request.query
    const { returnTo, profile } = await completeEntraCallback(request, params)
    return h.redirect(resolvePostLoginRedirect(profile.role, returnTo))
  }
}

export const entraRoutes = {
  plugin: {
    name: 'auth-entra',
    register(server) {
      server.route([
        { method: 'GET', path: PAGE_PATHS.ENTRA_SIGN_IN, ...signInPage },
        { method: 'GET', path: '/auth/entra/start', ...startSignIn },
        { method: ['GET', 'POST'], path: '/auth/entra/callback', ...callback }
      ])
    }
  }
}

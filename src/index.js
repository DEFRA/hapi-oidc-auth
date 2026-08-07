// @defra/hapi-oidc-auth — reusable Hapi plugin for Microsoft Entra ID sign-in.
//
// Users sign in via Microsoft Entra ID (OIDC auth-code + PKCE). The applicant
// (Defra Customer Identity) journey lives in a separate package,
// hapi-oidc-auth-defra-id.
//
// The consuming app registers this plugin and passes its config as options;
// per-environment values + secrets come from the host (cdp-app-config + CDP
// Secrets). The plugin holds no secrets.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { setConfig } from './config.js'
import { entraRoutes } from './entra/routes.js'
import { sharedAuthRoutes } from './shared-routes.js'

// Public surface for host apps: route guards (to protect their own pages), the
// header account context, session read helpers, and the canonical auth paths.
export {
  requireAuth,
  requireRole,
  requireAuthorised,
  getAuthSession,
  isAuthenticated,
  PAGE_PATHS
} from './session.js'
export { buildAccount } from './build-account.js'

export const PLUGIN_NAME = 'hapi-oidc-auth'

// Directory holding the plugin's Nunjucks views. The host must add this to its
// @hapi/vision `path` and its nunjucks loader so `h.view('entra/sign-in')`
// resolves and the views can extend the host's `layouts/page.njk`. Exported so
// the host can wire it in (see README → Views).
export const viewsPath = path.dirname(fileURLToPath(import.meta.url))

const VALID_MODES = ['mock', 'live']

// Validate the register options up front so misconfiguration fails fast with a
// clear message rather than a confusing runtime error mid sign-in.
function assertOptions(options) {
  const { entra } = options ?? {}
  if (!entra) {
    throw new Error(
      `${PLUGIN_NAME}: the \`entra\` option is required ` +
        '(use mode: "mock" for local/demo).'
    )
  }
  // Fail closed on an unrecognised mode. Without this, a typo like "Live" or a
  // misnamed env var would be silently treated as mock (see resolveEntra's
  // `?? 'mock'`), i.e. a live deployment would hand out a mock identity with no
  // credentials. `mode` may be omitted (→ mock), but if set it must be exact.
  if (entra.mode !== undefined && !VALID_MODES.includes(entra.mode)) {
    throw new Error(
      `${PLUGIN_NAME}: entra.mode must be "mock" or "live" ` +
        `(got ${JSON.stringify(entra.mode)}).`
    )
  }
}

// The resolved config carries the clientSecret (the OIDC client reads it via
// getConfig()). Never expose it on server.plugins where any other plugin/route
// could read it back out.
function withoutSecrets(resolved) {
  const { clientSecret, ...entraPublic } = resolved.entra
  return { ...resolved, entra: entraPublic }
}

export const hapiOidcAuth = {
  plugin: {
    name: PLUGIN_NAME,
    version: '0.2.0',
    async register(server, options) {
      assertOptions(options)

      // Resolve + store the config (applying defaults) so the journey modules
      // read it via getConfig() instead of a host-specific config module.
      const resolved = setConfig(options)
      server.expose('options', withoutSecrets(resolved))
      server.expose('viewsPath', viewsPath)

      // The Entra sign-in journey plus the shared account / sign-out routes.
      // Their routes render the plugin's own views, which the host resolves via
      // `viewsPath` (see README).
      await server.register([entraRoutes, sharedAuthRoutes])
    }
  }
}

export default hapiOidcAuth

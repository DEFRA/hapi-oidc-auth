// @defra/hapi-oidc-auth — reusable Hapi plugin for DEFRA OIDC sign-in.
//
// Two user populations, both OIDC auth-code + PKCE:
//   - Applicants (external)   -> Defra Customer Identity (Azure AD B2C)
//   - Case Officers (internal) -> Microsoft Entra ID
//
// The consuming app registers this plugin and passes its config as options;
// per-environment values + secrets come from the host (cdp-app-config + CDP
// Secrets). The plugin holds no secrets.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { setConfig } from './config.js'
import { defraIdRoutes } from './defra-id/routes.js'
import { entraRoutes } from './entra/routes.js'
import { sharedAuthRoutes } from './shared-routes.js'

// Public surface for host apps: route guards (to protect their own pages), the
// header account context, session read helpers, and the canonical auth paths.
export {
  requireAuth,
  requireRole,
  requireApplicant,
  requireCaseOfficer,
  getAuthSession,
  isAuthenticated,
  PAGE_PATHS
} from './session.js'
export { buildAccount } from './build-account.js'

export const PLUGIN_NAME = 'hapi-oidc-auth'

// Directory holding the plugin's Nunjucks views. The host must add this to its
// @hapi/vision `path` and its nunjucks loader so `h.view('defra-id/sign-in')`
// resolves and the views can extend the host's `layouts/page.njk`. Exported so
// the host can wire it in (see README → Views).
export const viewsPath = path.dirname(fileURLToPath(import.meta.url))

// Validate the register options up front so misconfiguration fails fast with a
// clear message rather than a confusing runtime error mid sign-in.
function assertOptions(options) {
  const { defraId, entra } = options ?? {}
  if (!defraId || !entra) {
    throw new Error(
      `${PLUGIN_NAME}: both \`defraId\` and \`entra\` options are required ` +
        '(use mode: "mock" for local/demo).'
    )
  }
}

export const hapiOidcAuth = {
  plugin: {
    name: PLUGIN_NAME,
    version: '0.1.0',
    async register(server, options) {
      assertOptions(options)

      // Resolve + store the config (applying defaults) so the journey modules
      // read it via getConfig() instead of a host-specific config module.
      const resolved = setConfig(options)
      server.expose('options', resolved)
      server.expose('viewsPath', viewsPath)

      // Both journeys — Applicant (Defra Customer Identity) and Case Officer
      // (Entra) — plus the shared chooser / account / sign-out routes. Their
      // routes render the plugin's own views, which the host resolves via
      // `viewsPath` (see README).
      await server.register([defraIdRoutes, entraRoutes, sharedAuthRoutes])
    }
  }
}

export default hapiOidcAuth

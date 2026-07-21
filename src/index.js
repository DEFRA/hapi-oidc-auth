// @defra/hapi-oidc-auth — reusable Hapi plugin for DEFRA OIDC sign-in.
//
// Two user populations, both OIDC auth-code + PKCE:
//   - Applicants (external)   -> Defra Customer Identity (Azure AD B2C)
//   - Case Officers (internal) -> Microsoft Entra ID
//
// The consuming app registers this plugin and passes its config as options;
// per-environment values + secrets come from the host (cdp-app-config + CDP
// Secrets). The plugin holds no secrets.

import { setConfig } from './config.js'

export const PLUGIN_NAME = 'hapi-oidc-auth'

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
    register(server, options) {
      assertOptions(options)

      // Resolve + store the config (applying defaults) so the journey modules
      // read it via getConfig() instead of a host-specific config module.
      const resolved = setConfig(options)
      server.expose('options', resolved)

      // The defra-id (applicant) journey logic is extracted and unit-tested
      // (client/service/session/oidc-common/mock/permissions). Still to wire in:
      //   - the plugin's Nunjucks view path + the defra-id/entra/shared ROUTES
      //   - the entra (case officer) journey
      //   - the `account` header view context and requireAuth/requireRole guards
    }
  }
}

export default hapiOidcAuth

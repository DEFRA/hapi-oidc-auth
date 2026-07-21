// @defra/hapi-oidc-auth — reusable Hapi plugin for DEFRA OIDC sign-in.
//
// Two user populations, both OIDC auth-code + PKCE:
//   - Applicants (external)   -> Defra Customer Identity (Azure AD B2C)
//   - Case Officers (internal) -> Microsoft Entra ID
//
// The consuming app registers this plugin and passes its config as options;
// per-environment values + secrets come from the host (cdp-app-config + CDP
// Secrets). The plugin holds no secrets.

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

      const { defraId, entra, redirects = {} } = options

      // Expose the resolved config so the (to-be-extracted) route/service
      // modules can read it via server.plugins[PLUGIN_NAME] instead of importing
      // a host-specific config module.
      server.expose('options', { defraId, entra, redirects })

      // TODO (extraction from pesticides-poc-frontend, in sequence):
      //   - register the plugin's Nunjucks view path
      //   - register the defra-id (applicant) routes + service + client
      //   - register the entra (case officer) routes + service + client
      //   - register the shared chooser / account / sign-out routes
      //   - add the `account` header view context (build-account)
      //   - expose the requireAuth / requireRole guards
      //   - mock mode identities
    }
  }
}

export default hapiOidcAuth

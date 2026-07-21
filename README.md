# @defra/hapi-oidc-auth

Reusable [Hapi](https://hapi.dev) plugin that adds DEFRA sign-in to any CDP
frontend, for both user populations:

- **Applicants** (external) → **Defra Customer Identity** (Azure AD B2C)
- **Case Officers** (internal) → **Microsoft Entra ID**

Both use OIDC auth-code + PKCE. The plugin provides the OIDC Relying Party
plumbing (redirect, `form_post` callback, JWKS token verification, state/nonce,
session, role guards), a **mock mode** for local/demo, its own sign-in views,
and the signed-in header account block — so a consuming app adds login by
registering the plugin and passing its config.

> **Status: work in progress.** This is the initial package foundation and the
> register-options contract. The journey implementations are being extracted
> from `pesticides-poc-frontend` (where they are live-verified). See the
> proposal for scope and sequence.

## Install

While the API is settling, consume via a git tag (bypasses the CDP
`min-release-age` throttle):

```jsonc
// package.json
"dependencies": {
  "@defra/hapi-oidc-auth": "github:DEFRA/hapi-oidc-auth#v0.1.0"
}
```

Once stable it will be published to npm as `@defra/hapi-oidc-auth` (public,
alongside the other `@defra/*` packages).

## Usage

```js
import { hapiOidcAuth } from '@defra/hapi-oidc-auth'

await server.register({
  plugin: hapiOidcAuth,
  options: {
    // External applicants — Defra Customer Identity (B2C)
    defraId: {
      mode: 'mock', // 'mock' (local identities) or 'live'
      wellKnownUrl: process.env.DEFRA_ID_WELL_KNOWN_URL,
      clientId: process.env.DEFRA_ID_CLIENT_ID,
      clientSecret: process.env.DEFRA_ID_CLIENT_SECRET, // never commit — CDP Secrets
      serviceId: process.env.DEFRA_ID_SERVICE_ID,
      policy: process.env.DEFRA_ID_POLICY,
      publicBaseUrl: process.env.DEFRA_ID_PUBLIC_BASE_URL,
      redirectPath: '/auth/defra-id/callback',
      signOutRedirectUrl: '/'
      // claims: { ... } // optional overrides if the live token uses other names
    },

    // Internal case officers — Microsoft Entra ID
    entra: {
      mode: 'mock',
      tenantId: process.env.ENTRA_TENANT_ID,
      clientId: process.env.ENTRA_CLIENT_ID,
      clientSecret: process.env.ENTRA_CLIENT_SECRET, // never commit — CDP Secrets
      publicBaseUrl: process.env.ENTRA_PUBLIC_BASE_URL,
      redirectPath: '/auth/entra/callback',
      signOutRedirectUrl: '/',
      caseOfficerRoleValue: 'case_officer' // must match the Entra app-role value
    },

    // Where each population lands after sign-in (app-specific)
    redirects: {
      applicant: '/register/type',
      caseOfficer: '/admin/applications',
      signOut: '/'
    }
  }
})
```

### What the host app provides

- `@hapi/hapi`, `@hapi/yar` (session), `nunjucks`, and `govuk-frontend` — these
  are **peer dependencies**; the plugin uses the host's versions.
- Per-environment config values + secrets (via `cdp-app-config` and the CDP
  Secrets page — the plugin never holds secrets).
- Its own home/landing page and downstream pages (e.g. admin, register); the
  post-login destinations are passed via `redirects`.

### What the plugin adds

- Routes: sign-in chooser, `defra-id` + `entra` start/callback, `/auth/account`,
  `/auth/sign-out`.
- Its own Nunjucks views (extending the host's `govuk/template.njk`).
- The `account` view context (signed-in name/role + sign-out) for the header.
- Session + role guards (`requireAuth`, `requireRole`) and mock mode.

## Guarding your own pages

The plugin exports Hapi `pre`-handler guards and helpers so a host can protect its
own routes and read the session:

```js
import {
  requireAuth, // any signed-in user
  requireCaseOfficer, // role === case_officer
  requireApplicant, // role === applicant
  getAuthSession,
  buildAccount, // { name, roleLabel, accountUrl, signOutUrl } | null — for the header
  PAGE_PATHS
} from '@defra/hapi-oidc-auth'

server.route({
  method: 'GET',
  path: '/admin/applications',
  options: { pre: [{ method: requireCaseOfficer }] },
  handler: (request, h) => h.view('admin', { session: getAuthSession(request) })
})
```

Wire `buildAccount(request)` into your Nunjucks view context (e.g. as `account`)
to show the signed-in name + sign-out link in your header.

## Views (host wiring)

The plugin's sign-in views **extend the host's `layouts/page.njk`** so they inherit
the host's GOV.UK chrome. For that to resolve, the host adds the plugin's exported
`viewsPath` to both its nunjucks loader and its `@hapi/vision` `path`:

```js
import { hapiOidcAuth, viewsPath } from '@defra/hapi-oidc-auth'

const environment = nunjucks.configure(
  ['node_modules/govuk-frontend/dist/', 'server/common/templates', viewsPath],
  { autoescape: true }
)

server.views({
  engines: { njk: /* ...compile with `environment`... */ },
  relativeTo: /* host root */,
  path: ['server/routes', viewsPath] // so h.view('defra-id/sign-in') resolves
})
```

`test-helpers/view-server.js` is a minimal working example of this wiring.

## Scripts

```sh
npm test          # vitest + coverage
npm run lint      # eslint (neostandard)
npm run format    # prettier --write
```

## Licence

[OGL-UK-3.0](./LICENCE)

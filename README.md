# @defra/hapi-oidc-auth

Reusable [Hapi](https://hapi.dev) plugin that adds **DEFRA case-officer sign-in
via Microsoft Entra ID** (OpenID Connect auth-code + PKCE) to any CDP frontend.

The plugin provides the OIDC Relying Party plumbing (redirect, `form_post`
callback, JWKS token verification, state/nonce, session, role guards), a
**mock mode** for local/demo, its own sign-in view, and the signed-in header
account block — so a consuming app adds case-officer login by registering the
plugin and passing its config.

> The **applicant** (Defra Customer Identity) journey lives in a separate
> package, `hapi-oidc-auth-defra-id`. This package is case-officer only.

## Install

```sh
npm install @defra/hapi-oidc-auth
```

## Usage

```js
import { hapiOidcAuth } from '@defra/hapi-oidc-auth'

await server.register({
  plugin: hapiOidcAuth,
  options: {
    entra: {
      mode: 'mock', // 'mock' (local demo identity) or 'live'
      tenantId: process.env.ENTRA_TENANT_ID,
      clientId: process.env.ENTRA_CLIENT_ID,
      clientSecret: process.env.ENTRA_CLIENT_SECRET, // never commit — CDP Secrets
      publicBaseUrl: process.env.ENTRA_PUBLIC_BASE_URL,
      redirectPath: '/auth/entra/callback',
      signOutRedirectUrl: '/',
      caseOfficerRoleValue: 'case_officer' // must match the Entra app-role value
    },

    // Where the case officer lands after sign-in / out (app-specific)
    redirects: {
      caseOfficer: '/admin/applications',
      signOut: '/'
    }
  }
})
```

`case_officer` access is granted only when the Entra ID token's `roles` claim
carries the configured `caseOfficerRoleValue` — define that App role on the
Entra app registration and assign it to the relevant group/users.

## What the host app must provide

Beyond the peer dependencies (`@hapi/hapi`, `@hapi/yar`, `@hapi/vision`,
`nunjucks`, `govuk-frontend`), a host must wire up three things. The first two
fail silently in ways that only show up in live mode:

**1. An `onPreResponse` error boundary (or you get 500s instead of 401/422).**
The plugin's callbacks `throw` plain errors carrying `.statusCode` (401 on a bad
token, 422 on a bad state/nonce or incomplete config). Hapi boomifies a non-Boom
throw to **500**, so the host must recover the intended status:

```js
server.ext('onPreResponse', (request, h) => {
  const response = request.response
  if (response?.isBoom) {
    const intended = response.statusCode // the thrown .statusCode survives boomify
    if (Number.isInteger(intended) && intended >= 400 && intended < 600) {
      return h
        .response(response.message || 'Error')
        .code(intended)
        .takeover()
    }
  }
  return h.continue
})
```

**2. A `SameSite=None` session cookie for live mode.**
Live sign-in uses `response_mode=form_post`, so the IdP returns the result via a
**cross-site POST** to the callback. A `Lax`/`Strict` session cookie is **not
sent** on that request, so `@hapi/yar` loses the OIDC `state`/`nonce`/PKCE
verifier and every live callback 422s. Set `isSameSite: 'None'` **when**
`isSecure: true`:

```js
cookieOptions: { isSecure, isSameSite: isSecure ? 'None' : 'Lax' }
```

**3. The plugin's views** — see [Views](#views-host-wiring) below.

`test-helpers/view-server.js` is a minimal reference host wiring all three.

## Guarding your own pages

```js
import {
  requireAuth, // any signed-in user
  requireCaseOfficer, // role === case_officer
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

The plugin's sign-in view **extends the host's `layouts/page.njk`**. For that to
resolve, the host adds the plugin's exported `viewsPath` to both its nunjucks
loader and its `@hapi/vision` `path`:

```js
import { hapiOidcAuth, viewsPath } from '@defra/hapi-oidc-auth'

const environment = nunjucks.configure(
  ['node_modules/govuk-frontend/dist/', 'server/common/templates', viewsPath],
  { autoescape: true }
)

server.views({
  engines: { njk: /* ...compile with `environment`... */ },
  relativeTo: /* host root */,
  path: ['server/routes', viewsPath] // so h.view('entra/sign-in') resolves
})
```

## Scripts

```sh
npm test          # vitest + coverage
npm run lint      # eslint (neostandard)
npm run format    # prettier --write
```

## Licence

[OGL-UK-3.0](./LICENCE)

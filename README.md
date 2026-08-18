# @defra/hapi-oidc-auth

Reusable [Hapi](https://hapi.dev) plugin that adds **sign-in via Microsoft
Entra ID** (OpenID Connect auth-code + PKCE) to any CDP frontend.

The plugin provides the OIDC Relying Party plumbing (redirect, `form_post`
callback, JWKS token verification, state/nonce, session, role guards), a
**mock mode** for local/demo, its own sign-in view, and the signed-in header
account block — so a consuming app adds Entra ID login by registering the
plugin and passing its config. It is **role-agnostic**: each app declares the
role value(s) its tokens carry, so it works for any staff service.

> The **applicant** (Defra Customer Identity) journey lives in a separate
> package, `hapi-oidc-auth-defra-id`. This package is Entra ID only.

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
      // Required: the Entra app-role value(s) that grant access. There is no
      // default — declare whatever value(s) your app's tokens carry (name the
      // App role whatever suits your service).
      roleValues: ['case_officer']
    },

    // Where the user lands after sign-in / out (app-specific)
    redirects: {
      postLogin: '/admin/applications',
      signOut: '/'
    }
  }
})
```

Access is granted only when the Entra ID token's `roles` claim carries one of
the configured `roleValues` — define that App role on the Entra app registration
and assign it to the relevant group/users. `roleValues` also accepts a single
string (`roleValues: 'ocr_officer'`). If you configure none, `requireAuthorised`
denies everyone (fail closed).

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

The plugin is **role-agnostic** — it gates on whatever role value(s) your tokens
carry, so it works for any project ('case_officer', 'admission_officer',
'funding_reviewer', …):

```js
import {
  requireAuth, // any signed-in user
  requireAuthorised, // signed in AND carries one of the configured `entra.roleValues`
  requireRole, // requireRole('admission_officer', 'reviewer') — signed in AND one of these
  getAuthSession,
  buildAccount, // { name, roleLabel, accountUrl, signOutUrl } | null — for the header
  PAGE_PATHS
} from '@defra/hapi-oidc-auth'

server.route({
  method: 'GET',
  path: '/admin/applications',
  // requireAuthorised uses the roleValues you passed at register time; or use
  // requireRole('...') to gate a page on a specific role.
  options: { pre: [{ method: requireAuthorised }] },
  handler: (request, h) => h.view('admin', { session: getAuthSession(request) })
})
```

Wire `buildAccount(request)` into your Nunjucks view context (e.g. as `account`)
to show the signed-in name + sign-out control in your header.

**Sign-out is `POST /auth/sign-out` (not GET)** — a GET would let any cross-site
link or image silently log the user out (the live session cookie is
`SameSite=None`). Render the sign-out control as a form submit, not a link, using
`account.signOutUrl` as the form action:

```njk
<form method="post" action="{{ account.signOutUrl }}">
  {{ govukButton({ text: "Sign out", classes: "govuk-button--secondary" }) }}
</form>
```

The route also rejects cross-site POSTs (via `Sec-Fetch-Site`), so an attacker
page cannot auto-submit a form to sign the user out; same-origin form submits
from your header/account page work normally.

> **Breaking change in 0.3.0:** `/auth/sign-out` is now `POST`-only (was `GET`).
> Any host that renders a sign-out **link** (`<a href="{{ account.signOutUrl }}">`)
> must switch it to the form above when upgrading, or sign-out will 404.

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

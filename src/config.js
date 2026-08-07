// Plugin config holder. The consuming app passes its OIDC config as register
// options; this module resolves them (applying defaults) and exposes them to the
// journey modules — replacing the host-specific convict config the code used
// when it lived inside pesticides-poc-frontend.
//
// Single resolved instance per process, set once when the plugin registers.

import { DEFAULT_CONTENT } from './content.js'

// Where the user lands after sign-in / sign-out. App-specific, so overridable.
const DEFAULT_REDIRECTS = {
  postLogin: '/',
  signOut: '/'
}

// The Entra app-role value(s) that grant access. There is no default — each
// consuming project must declare the role value(s) its tokens carry via
// `roleValues` (a string or an array). With none configured, `requireAuthorised`
// matches nothing and denies everyone (fail closed).
const DEFAULT_ROLE_VALUES = []

let resolved = null

// Accept an array, a single string, or nothing (→ default) for roleValues.
function normaliseRoleValues(value) {
  if (Array.isArray(value)) {
    return value.map(String)
  }
  if (value) {
    return [String(value)]
  }
  return DEFAULT_ROLE_VALUES
}

function resolveEntra(entra = {}) {
  return {
    mode: entra.mode ?? 'mock',
    tenantId: entra.tenantId ?? '',
    clientId: entra.clientId ?? '',
    clientSecret: entra.clientSecret ?? '',
    publicBaseUrl: entra.publicBaseUrl ?? '',
    redirectPath: entra.redirectPath ?? '/auth/entra/callback',
    signOutRedirectUrl: entra.signOutRedirectUrl ?? '/',
    roleValues: normaliseRoleValues(entra.roleValues)
  }
}

// Per-section shallow merge of consumer content overrides onto the defaults, so a
// consumer can override just the strings it cares about.
function resolveContent(content = {}) {
  const merged = {}
  for (const section of Object.keys(DEFAULT_CONTENT)) {
    merged[section] = {
      ...DEFAULT_CONTENT[section],
      ...content[section]
    }
  }
  return merged
}

export function setConfig(options = {}) {
  resolved = {
    entra: resolveEntra(options.entra),
    redirects: { ...DEFAULT_REDIRECTS, ...options.redirects },
    content: resolveContent(options.content)
  }
  return resolved
}

export function getConfig() {
  if (!resolved) {
    throw new Error(
      'hapi-oidc-auth: config not initialised — register the plugin first ' +
        '(or call setConfig in tests).'
    )
  }
  return resolved
}

// Plugin config holder. The consuming app passes its OIDC config as register
// options; this module resolves them (applying defaults) and exposes them to the
// journey modules — replacing the host-specific convict config the code used
// when it lived inside pesticides-poc-frontend.
//
// Single resolved instance per process, set once when the plugin registers.

// Defra Identity claim contract. Defaults match the assumed contract; a consumer
// overrides any name whose live token differs (no code change needed).
const DEFAULT_DEFRA_ID_CLAIMS = {
  sub: 'sub',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  contactId: 'contactId',
  currentRelationshipId: 'currentRelationshipId',
  relationships: 'relationships',
  roles: 'roles',
  sessionId: 'sessionId'
}

// Where each population lands after sign-in. App-specific, so overridable.
const DEFAULT_REDIRECTS = {
  applicant: '/register/type',
  caseOfficer: '/admin/applications',
  signOut: '/'
}

let resolved = null

function resolveDefraId(defraId = {}) {
  return {
    mode: defraId.mode ?? 'mock',
    wellKnownUrl: defraId.wellKnownUrl ?? '',
    clientId: defraId.clientId ?? '',
    clientSecret: defraId.clientSecret ?? '',
    serviceId: defraId.serviceId ?? '',
    policy: defraId.policy ?? '',
    publicBaseUrl: defraId.publicBaseUrl ?? '',
    redirectPath: defraId.redirectPath ?? '/auth/defra-id/callback',
    signOutRedirectUrl: defraId.signOutRedirectUrl ?? '/',
    claims: { ...DEFAULT_DEFRA_ID_CLAIMS, ...(defraId.claims ?? {}) }
  }
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
    caseOfficerRoleValue: entra.caseOfficerRoleValue ?? 'case_officer'
  }
}

export function setConfig(options = {}) {
  resolved = {
    defraId: resolveDefraId(options.defraId),
    entra: resolveEntra(options.entra),
    redirects: { ...DEFAULT_REDIRECTS, ...(options.redirects ?? {}) }
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

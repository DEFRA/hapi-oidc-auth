// Default page content (English) for the plugin's sign-in views. A consuming app
// overrides any section via the `content` register option (e.g. to reference its
// own service by name); anything not overridden falls back to these defaults.

export const LANG_EN = 'en'

const ENTRA_PROVIDER_NAME = 'Microsoft Entra ID'
const NOT_CONFIGURED_PREFIX = 'Live sign-in is not fully configured ('
const SIGN_IN_BUTTON = 'Sign in'

export const DEFAULT_CONTENT = {
  // Shared across the sign-in / account pages.
  authShared: {
    authRequired: 'You need to sign in to continue.',
    alreadySignedInPrefix: 'You are already signed in as',
    viewAccount: 'View your account',
    or: 'or',
    signOut: 'sign out',
    modeLabel: 'Mode:',
    mockSuffix: ' — a local demo identity is used; no credentials needed.'
  },

  entraSignIn: {
    pageTitle: 'Staff sign in',
    heading: 'Case officer sign in',
    caption: ENTRA_PROVIDER_NAME,
    intro:
      'Staff sign in with their Defra account to review and decide applications.',
    liveEnabled:
      'Live mode is enabled — you will sign in with your real Defra staff account.',
    notConfiguredPrefix: NOT_CONFIGURED_PREFIX,
    notConfiguredSuffix: '). Set the entra.* options.',
    signInButton: SIGN_IN_BUTTON
  },

  account: {
    pageTitle: 'Your account',
    heading: 'You are signed in',
    keyName: 'Name',
    keyEmail: 'Email',
    keyRole: 'Role',
    keyProvider: 'Identity provider',
    keyMode: 'Mode',
    organisationsHeading: 'Organisations',
    noOrganisations: 'No organisations (internal staff account).',
    currentTag: 'Current',
    permissionsHeading: 'Permissions (resolved downstream)',
    signOutButton: 'Sign out'
  }
}
